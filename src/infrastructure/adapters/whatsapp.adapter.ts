import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { resolvePdfUnit, stripBoxSuffix } from '../../domain/constants/sunat-units';

@Injectable()
export class WhatsappAdapter {
  private readonly logger = new Logger(WhatsappAdapter.name);
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL') || 'http://localhost:8080';
    this.apiKey = this.configService.get<string>('WHATSAPP_API_KEY') || 'devpro-whatsapp-key';
    this.instanceName = this.configService.get<string>('WHATSAPP_INSTANCE_NAME') || 'devpro';
  }

  /** Format phone number to international Peruvian format 519XXXXXXXX */
  private formatPhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 9) return `51${clean}`;
    return clean;
  }

  /** Convert total amount to words (Spanish) */
  private numLetras(amount: number): string {
    const total = Number(amount || 0).toFixed(2);
    const parts = total.split('.');
    const entero = parseInt(parts[0], 10);
    const dec = parts[1] || '00';

    const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticinco', 'veintisiete', 'veintiocho', 'veintinueve'];
    const DECENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const CIENTOS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    let s = '';
    if (entero === 0) s = 'cero';
    else if (entero === 100) s = 'cien';
    else {
      const c = Math.floor(entero / 100);
      const restC = entero % 100;
      const d = Math.floor(restC / 10);
      const u = restC % 10;

      if (c > 0) s += CIENTOS[c] + ' ';
      if (restC > 0 && restC < 30) s += UNIDADES[restC];
      else if (restC >= 30) s += DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
    }
    return `${s.trim()} con ${dec}/100 Soles`;
  }

  /** Format invoice number short format (e.g. B001-00000015 -> B001-15) */
  private formatShortSerie(inv: string): string {
    if (!inv) return 'COMPROBANTE';
    const parts = inv.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      return `${parts[0]}-${isNaN(num) ? parts[1] : num}`;
    }
    return inv;
  }

  /** Generate dynamic ticket PDF buffer matching exact UI ticket layout */
  public async generateReceiptPdfBuffer(sale: any, companyInfo: any): Promise<Buffer> {
    const isNota = sale?.documentType === 'nota_venta';
    const isFact = sale?.documentType === 'factura';
    const docLabel = isNota ? 'NOTA DE VENTA' : isFact ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
    const serie = this.formatShortSerie(sale?.invoiceNumber || 'COMPROBANTE');

    // Prioritize Commercial Name (e.g. PADRE ETERNO) over Razon Social
    const companyTradeName = companyInfo?.nombreComercial || companyInfo?.razonSocial || 'PADRE ETERNO';
    const companyRuc = companyInfo?.ruc || '10267075374';
    const companyAddr = companyInfo?.direccion || 'JR. CHEPEN 404';

    const customerName = sale?.customer?.name || 'Consumidor Final';
    const customerNit = sale?.customer?.nit || 'CF';

    const numTotal = Number(sale?.totalAmount || 0);
    const totalAmtStr = numTotal.toFixed(2);
    const igvAmtNum = Number(sale?.taxAmount || (numTotal * 18 / 118));
    const baseAmtNum = Number(sale?.subtotal || (numTotal - igvAmtNum));
    const igvAmtStr = igvAmtNum.toFixed(2);
    const baseAmtStr = baseAmtNum.toFixed(2);

    const saleDateObj = sale?.saleDate ? new Date(sale.saleDate) : new Date();
    const dateStr = saleDateObj.toISOString().split('T')[0];
    const timeStr = saleDateObj.toTimeString().split(' ')[0];

    // Load Logo image buffer from local file system or URL
    let logoBuffer: Buffer | null = null;
    if (companyInfo?.logoUrl) {
      try {
        const logoUrlStr = String(companyInfo.logoUrl).trim();
        if (logoUrlStr.startsWith('http://') || logoUrlStr.startsWith('https://')) {
          const logoRes = await axios.get(logoUrlStr, { responseType: 'arraybuffer', timeout: 5000 });
          logoBuffer = Buffer.from(logoRes.data);
        } else {
          // Relative path like /uploads/logos/logo-xxx.png
          const relPath = logoUrlStr.startsWith('/') ? logoUrlStr.substring(1) : logoUrlStr;
          const fullPath = path.join(process.cwd(), relPath);
          if (fs.existsSync(fullPath)) {
            logoBuffer = fs.readFileSync(fullPath);
          }
        }
      } catch (e) {
        this.logger.warn('No se pudo cargar la imagen del logo para el PDF:', e);
      }
    }

    // Generate QR Code Buffer
    const qrText = `${companyRuc}|${isFact ? '01' : isNota ? '00' : '03'}|${serie}|${igvAmtStr}|${totalAmtStr}|${dateStr}|${customerNit === 'CF' ? '-' : customerNit.length === 11 ? '6' : '1'}|${customerNit}`;
    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(qrText, { margin: 1, width: 110 });
    } catch (e) {
      this.logger.warn('Error generando buffer QR:', e);
    }

    return new Promise((resolve, reject) => {
      const pageWidth = 240;
      const margin = 10;
      const printWidth = pageWidth - margin * 2; // 220pt

      const doc = new PDFDocument({ size: [pageWidth, 750], margin: margin });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 1. Logo (Centrado en la parte superior si existe)
      if (logoBuffer) {
        try {
          const logoW = 110;
          const logoH = 75;
          doc.image(logoBuffer, (pageWidth - logoW) / 2, doc.y, { fit: [logoW, logoH], align: 'center' });
          doc.y += logoH + 6;
        } catch (e) {
          this.logger.warn('Error dibujando imagen de logo en PDFKit:', e);
        }
      }

      // 2. Nombre Comercial (PADRE ETERNO) + RUC + Dirección
      const tradeName = (companyInfo?.nombreComercial || 'PADRE ETERNO').toUpperCase();

      doc.font('Helvetica-Bold').fontSize(13).text(tradeName, margin, doc.y, { width: printWidth, align: 'center' });
      doc.font('Helvetica').fontSize(8.5).text(`RUC: ${companyRuc}`, margin, doc.y, { width: printWidth, align: 'center' });
      doc.text(`D. Comercial: ${companyAddr}`, margin, doc.y, { width: printWidth, align: 'center' });
      doc.moveDown(0.4);

      // 3. Tipo de Comprobante & Serie
      doc.font('Helvetica-Bold').fontSize(11).text(docLabel, margin, doc.y, { width: printWidth, align: 'center' });
      doc.fontSize(12).text(serie, margin, doc.y, { width: printWidth, align: 'center' });
      doc.moveDown(0.4);

      // 4. Datos de Emisión y Cliente
      doc.font('Helvetica').fontSize(8.5);
      doc.text(`F. Emisión:       ${dateStr}`, margin, doc.y, { width: printWidth });
      doc.text(`H. Emisión:       ${timeStr}`, margin, doc.y, { width: printWidth });
      doc.font('Helvetica-Bold').text(`Cliente:            ${customerName}`, margin, doc.y, { width: printWidth });
      doc.font('Helvetica').text(`DNI/RUC:          ${customerNit}`, margin, doc.y, { width: printWidth });
      doc.moveDown(0.4);

      // 5. Tabla de Ítems Header (Líneas sólidas superior e inferior)
      const headerY = doc.y;
      doc.moveTo(margin, headerY).lineTo(pageWidth - margin, headerY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.font('Helvetica-Bold').fontSize(7.5).text('CANT.', margin, headerY + 4, { width: 34 });
      doc.text('UNIDAD', margin + 34, headerY + 4, { width: 36 });
      doc.text('DESCRIPCIÓN', margin + 70, headerY + 4, { width: 85 });
      doc.text('P.UNIT', margin + 155, headerY + 4, { width: 30, align: 'right' });
      doc.text('TOTAL', margin + 185, headerY + 4, { width: 35, align: 'right' });
      const headerBottomY = headerY + 16;
      doc.moveTo(margin, headerBottomY).lineTo(pageWidth - margin, headerBottomY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.y = headerBottomY + 5;

      // 6. Lista de Productos
      doc.font('Helvetica').fontSize(7.5);
      (sale?.items || []).forEach((item: any) => {
        const qty = Number(item.quantity).toFixed(3);
        const name = stripBoxSuffix(
          item.productName || item.product?.name,
          item.product?.boxUnitName,
        ).substring(0, 20) || 'Producto';
        const price = Number(item.unitPrice).toFixed(2);
        const lineTotal = Number(item.subtotal || item.quantity * item.unitPrice).toFixed(2);
        const pdfUnit = resolvePdfUnit(
          item.product?.unit,
          item.product?.boxUnitName,
          item.productName,
        );

        const currentY = doc.y;
        doc.text(qty, margin, currentY, { width: 34 });
        doc.text(pdfUnit, margin + 34, currentY, { width: 36 });
        doc.text(name, margin + 70, currentY, { width: 85 });
        doc.text(price, margin + 155, currentY, { width: 30, align: 'right' });
        doc.font('Helvetica-Bold').text(lineTotal, margin + 185, currentY, { width: 35, align: 'right' });
        doc.font('Helvetica');
        doc.y = currentY + 11;
      });

      doc.moveDown(0.3);
      const totalsLineY = doc.y;
      doc.moveTo(margin, totalsLineY).lineTo(pageWidth - margin, totalsLineY).lineWidth(1.2).strokeColor('#000').stroke();
      doc.y = totalsLineY + 6;

      // 7. Totales (Perfectamente alineados a la derecha sin cortes de texto)
      doc.font('Helvetica').fontSize(8.5);
      doc.text(`OP. GRAVADAS: S/ ${baseAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
      doc.text(`IGV: S/ ${igvAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(12).text(`TOTAL A PAGAR: S/ ${totalAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
      doc.moveDown(0.4);

      // 8. Son
      doc.font('Helvetica').fontSize(8).text(`Son: ${this.numLetras(numTotal)}`, margin, doc.y, { width: printWidth, align: 'left' });
      doc.moveDown(0.6);

      // 9. Bloque Inferior: Código QR a la Izquierda + Datos de Pago a la Derecha
      const bottomBlockY = doc.y;
      if (qrBuffer && !isNota) {
        doc.image(qrBuffer, margin, bottomBlockY, { width: 85, height: 85 });
      }

      const textLeftMargin = isNota ? margin : margin + 92;
      doc.font('Helvetica-Bold').fontSize(8).text('FORMA DE PAGO:', textLeftMargin, bottomBlockY);
      doc.font('Helvetica').fontSize(8).text('Contado', textLeftMargin + 76, bottomBlockY);

      doc.font('Helvetica-Bold').text('PAGOS:', textLeftMargin, bottomBlockY + 12);
      doc.font('Helvetica').text(`- Efectivo - S/ ${totalAmtStr}`, textLeftMargin, bottomBlockY + 23);

      doc.font('Helvetica-Bold').text('VENDEDOR:', textLeftMargin, bottomBlockY + 38);
      doc.font('Helvetica').text(sale.cashier?.name || sale.cashierName || 'Administrador', textLeftMargin + 52, bottomBlockY + 38);

      doc.y = Math.max(doc.y, bottomBlockY + 90);
      doc.moveDown(0.5);

      // 10. Pie de Comprobante Oficial
      doc.font('Helvetica').fontSize(8).text('Para consultar el comprobante ingresar a', margin, doc.y, { width: printWidth, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(8.5).text('https://www.sunat.gob.pe', margin, doc.y, { width: printWidth, align: 'center' });
      doc.font('Helvetica').fontSize(7.5).text(
        isNota ? 'Documento interno no válido como comprobante' : 'Representación impresa del Comprobante Electrónico',
        margin,
        doc.y,
        { width: printWidth, align: 'center' }
      );
      doc.text('Consulte su comprobante en: www.sunat.gob.pe', margin, doc.y, { width: printWidth, align: 'center' });

      doc.end();
    });
  }

  /** Send media (PDF or Image) message via Evolution API */
  async sendMediaMessage(phone: string, base64OrUrl: string, caption: string, fileName = 'comprobante.pdf'): Promise<any> {
    const formattedPhone = this.formatPhoneNumber(phone);
    if (!formattedPhone || !base64OrUrl) return null;

    const url = `${this.apiUrl.replace(/\/$/, '')}/message/sendMedia/${this.instanceName}`;
    this.logger.log(`Enviando archivo PDF de comprobante via Evolution API a ${formattedPhone}...`);

    try {
      const response = await axios.post(
        url,
        {
          number: formattedPhone,
          options: {
            delay: 1200,
            presence: 'composing',
          },
          mediaMessage: {
            mediatype: 'document',
            fileName: fileName,
            caption: caption,
            media: base64OrUrl,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: this.apiKey,
          },
          timeout: 20000,
        },
      );
      this.logger.log(`PDF enviado con éxito por WhatsApp a ${formattedPhone}`);
      return response.data;
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'connect ECONNREFUSED';
      this.logger.warn(`Error al enviar archivo PDF por WhatsApp: ${errMsg}`);
      throw new BadRequestException(`No se pudo enviar por WhatsApp (${this.apiUrl}): Servidor Evolution API no disponible o no responde.`);
    }
  }

  /** Build and send full sales receipt text and PDF document to client */
  async sendInvoiceMessage(sale: any, recipientPhone: string, companyInfo?: any): Promise<any> {
    if (!recipientPhone) return null;

    const formattedPhone = this.formatPhoneNumber(recipientPhone);
    const isNota = sale?.documentType === 'nota_venta';
    const docLabel = isNota ? 'Nota de Venta' : sale?.documentType === 'factura' ? 'Factura Electrónica' : 'Boleta Electrónica';
    const companyName = companyInfo?.nombreComercial || companyInfo?.razonSocial || 'PADRE ETERNO';
    const total = Number(sale?.totalAmount || 0).toFixed(2);
    const serie = this.formatShortSerie(sale?.invoiceNumber || 'COMPROBANTE');

    const custName = sale?.customer?.name || 'Cliente';
    const caption = `*${companyName}*\n` +
      `Hola *${custName}*, gracias por su compra.\n\n` +
      `• *${docLabel}:* ${serie}\n` +
      `• *Total:* S/ ${total}\n\n` +
      `¡Que tenga un excelente día!`;

    // 1. If remote PDF URL is available from SUNAT, send it directly
    let mediaPayload = sale?.pdfUrl;

    // 2. If pdfUrl is null (e.g. beta environment), generate PDF buffer on the fly as Base64
    if (!mediaPayload) {
      try {
        const pdfBuffer = await this.generateReceiptPdfBuffer(sale, companyInfo);
        mediaPayload = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
      } catch (err: any) {
        this.logger.warn(`Error generando PDF buffer: ${err?.message}`);
      }
    }

    if (mediaPayload) {
      return this.sendMediaMessage(formattedPhone, mediaPayload, caption, `${serie}.pdf`);
    }

    return null;
  }
}
