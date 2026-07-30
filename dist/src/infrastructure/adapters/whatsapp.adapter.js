"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsappAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const QRCode = __importStar(require("qrcode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sunat_units_1 = require("../../domain/constants/sunat-units");
let WhatsappAdapter = WhatsappAdapter_1 = class WhatsappAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(WhatsappAdapter_1.name);
        this.apiUrl = this.configService.get('WHATSAPP_API_URL') || 'http://localhost:8080';
        this.apiKey = this.configService.get('WHATSAPP_API_KEY') || 'devpro-whatsapp-key';
        this.instanceName = this.configService.get('WHATSAPP_INSTANCE_NAME') || 'devpro';
    }
    formatPhoneNumber(phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 9)
            return `51${clean}`;
        return clean;
    }
    numLetras(amount) {
        const total = Number(amount || 0).toFixed(2);
        const parts = total.split('.');
        const entero = parseInt(parts[0], 10);
        const dec = parts[1] || '00';
        const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
        const DECENAS = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const CIENTOS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        const convertirMenorMil = (n) => {
            if (n === 0)
                return '';
            if (n === 100)
                return 'cien';
            let s = '';
            const c = Math.floor(n / 100);
            const restC = n % 100;
            const d = Math.floor(restC / 10);
            const u = restC % 10;
            if (c > 0)
                s += CIENTOS[c] + ' ';
            if (restC > 0 && restC < 30)
                s += UNIDADES[restC];
            else if (restC >= 30)
                s += DECENAS[d] + (u ? ' y ' + UNIDADES[u] : '');
            return s.trim();
        };
        let s = '';
        if (entero === 0) {
            s = 'cero';
        }
        else if (entero < 1000) {
            s = convertirMenorMil(entero);
        }
        else {
            const miles = Math.floor(entero / 1000);
            const resto = entero % 1000;
            const strMiles = miles === 1 ? 'mil' : `${convertirMenorMil(miles)} mil`;
            const strResto = convertirMenorMil(resto);
            s = `${strMiles} ${strResto}`.trim();
        }
        return `${s.trim()} con ${dec}/100 Soles`;
    }
    formatShortSerie(inv) {
        if (!inv)
            return 'COMPROBANTE';
        const parts = inv.split('-');
        if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            return `${parts[0]}-${isNaN(num) ? parts[1] : num}`;
        }
        return inv;
    }
    async generateReceiptPdfBuffer(sale, companyInfo) {
        const isNota = sale?.documentType === 'nota_venta';
        const isFact = sale?.documentType === 'factura';
        const docLabel = isNota ? 'NOTA DE VENTA' : isFact ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';
        const serie = this.formatShortSerie(sale?.invoiceNumber || 'COMPROBANTE');
        const companyTradeName = companyInfo?.nombreComercial || companyInfo?.razonSocial || 'PADRE ETERNO';
        const companyRuc = companyInfo?.ruc || '10267075374';
        const companyAddr = companyInfo?.direccion || 'JR. CHEPEN 404';
        const customerName = sale?.customer?.name || 'Consumidor Final';
        const customerNit = sale?.customer?.nit || 'CF';
        const customerAddr = sale?.customer?.address || null;
        const numTotal = Number(sale?.totalAmount || 0);
        const totalAmtStr = numTotal.toFixed(2);
        const igvAmtNum = Number(sale?.taxAmount || (numTotal * 18 / 118));
        const baseAmtNum = Number(sale?.subtotal || (numTotal - igvAmtNum));
        const igvAmtStr = igvAmtNum.toFixed(2);
        const baseAmtStr = baseAmtNum.toFixed(2);
        const saleDateObj = sale?.saleDate ? new Date(sale.saleDate) : new Date();
        const dateStr = saleDateObj.toISOString().split('T')[0];
        const timeStr = saleDateObj.toTimeString().split(' ')[0];
        let logoBuffer = null;
        if (companyInfo?.logoUrl) {
            try {
                const logoUrlStr = String(companyInfo.logoUrl).trim();
                if (logoUrlStr.startsWith('http://') || logoUrlStr.startsWith('https://')) {
                    const logoRes = await axios_1.default.get(logoUrlStr, { responseType: 'arraybuffer', timeout: 5000 });
                    logoBuffer = Buffer.from(logoRes.data);
                }
                else {
                    const relPath = logoUrlStr.startsWith('/') ? logoUrlStr.substring(1) : logoUrlStr;
                    const fullPath = path.join(process.cwd(), relPath);
                    if (fs.existsSync(fullPath)) {
                        logoBuffer = fs.readFileSync(fullPath);
                    }
                }
            }
            catch (e) {
                this.logger.warn('No se pudo cargar la imagen del logo para el PDF:', e);
            }
        }
        const qrText = `${companyRuc}|${isFact ? '01' : isNota ? '00' : '03'}|${serie}|${igvAmtStr}|${totalAmtStr}|${dateStr}|${customerNit === 'CF' ? '-' : customerNit.length === 11 ? '6' : '1'}|${customerNit}`;
        let qrBuffer = null;
        try {
            qrBuffer = await QRCode.toBuffer(qrText, { margin: 1, width: 110 });
        }
        catch (e) {
            this.logger.warn('Error generando buffer QR:', e);
        }
        return new Promise((resolve, reject) => {
            const pageWidth = 240;
            const margin = 10;
            const printWidth = pageWidth - margin * 2;
            const doc = new pdfkit_1.default({ size: [pageWidth, 750], margin: margin });
            const buffers = [];
            doc.on('data', (chunk) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', (err) => reject(err));
            if (logoBuffer) {
                try {
                    const logoW = 110;
                    const logoH = 75;
                    doc.image(logoBuffer, (pageWidth - logoW) / 2, doc.y, { fit: [logoW, logoH], align: 'center' });
                    doc.y += logoH + 6;
                }
                catch (e) {
                    this.logger.warn('Error dibujando imagen de logo en PDFKit:', e);
                }
            }
            const tradeName = (companyInfo?.nombreComercial || companyInfo?.razonSocial || 'COMERCIAL PADRE ETERNO').toUpperCase();
            doc.font('Helvetica-Bold').fontSize(12).text(tradeName, margin, doc.y, { width: printWidth, align: 'center' });
            doc.font('Helvetica').fontSize(8.5).text(`RUC: ${companyRuc}`, margin, doc.y, { width: printWidth, align: 'center' });
            doc.text(`D. Comercial: ${companyAddr}`, margin, doc.y, { width: printWidth, align: 'center' });
            doc.moveDown(0.4);
            doc.font('Helvetica-Bold').fontSize(11).text(docLabel, margin, doc.y, { width: printWidth, align: 'center' });
            doc.fontSize(12).text(serie, margin, doc.y, { width: printWidth, align: 'center' });
            doc.moveDown(0.4);
            doc.font('Helvetica').fontSize(8.5);
            doc.text(`F. Emisión:       ${dateStr}`, margin, doc.y, { width: printWidth });
            doc.text(`H. Emisión:       ${timeStr}`, margin, doc.y, { width: printWidth });
            doc.font('Helvetica-Bold').text(`Cliente:            ${customerName}`, margin, doc.y, { width: printWidth });
            doc.font('Helvetica').text(`DNI/RUC:          ${customerNit}`, margin, doc.y, { width: printWidth });
            if (customerAddr) {
                doc.font('Helvetica').text(`Dirección:        ${customerAddr.toUpperCase()}`, margin, doc.y, { width: printWidth });
            }
            doc.moveDown(0.4);
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
            doc.font('Helvetica').fontSize(7.5);
            (sale?.items || []).forEach((item) => {
                const qty = Number(item.quantity).toFixed(3);
                const rawName = (0, sunat_units_1.stripBoxSuffix)(item.productName || item.product?.name, item.product?.boxUnitName) || 'Producto';
                const price = Number(item.unitPrice).toFixed(2);
                const lineTotal = Number(item.subtotal || item.quantity * item.unitPrice).toFixed(2);
                const pdfUnit = (0, sunat_units_1.resolvePdfUnit)(item.product?.unit, item.product?.boxUnitName, item.productName);
                const currentY = doc.y;
                doc.text(qty, margin, currentY, { width: 34 });
                doc.text(pdfUnit, margin + 34, currentY, { width: 36 });
                const nameHeight = doc.heightOfString(rawName, { width: 83 });
                doc.text(rawName, margin + 70, currentY, { width: 83 });
                doc.text(price, margin + 155, currentY, { width: 30, align: 'right' });
                doc.font('Helvetica-Bold').text(lineTotal, margin + 185, currentY, { width: 35, align: 'right' });
                doc.font('Helvetica');
                doc.y = currentY + Math.max(nameHeight, 11) + 2;
            });
            doc.moveDown(0.3);
            const totalsLineY = doc.y;
            doc.moveTo(margin, totalsLineY).lineTo(pageWidth - margin, totalsLineY).lineWidth(1.2).strokeColor('#000').stroke();
            doc.y = totalsLineY + 6;
            doc.font('Helvetica').fontSize(8.5);
            doc.text(`OP. GRAVADAS: S/ ${baseAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
            doc.text(`IGV: S/ ${igvAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
            doc.font('Helvetica-Bold').fontSize(12).text(`TOTAL A PAGAR: S/ ${totalAmtStr}`, margin, doc.y, { width: printWidth, align: 'right' });
            doc.moveDown(0.4);
            doc.font('Helvetica').fontSize(8).text(`Son: ${this.numLetras(numTotal)}`, margin, doc.y, { width: printWidth, align: 'left' });
            doc.moveDown(0.6);
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
            doc.font('Helvetica').fontSize(8).text('Para consultar el comprobante ingresar a', margin, doc.y, { width: printWidth, align: 'center' });
            doc.font('Helvetica-Bold').fontSize(8.5).text('https://www.sunat.gob.pe', margin, doc.y, { width: printWidth, align: 'center' });
            doc.font('Helvetica').fontSize(7.5).text(isNota ? 'Documento interno no válido como comprobante' : 'Representación impresa del Comprobante Electrónico', margin, doc.y, { width: printWidth, align: 'center' });
            doc.text('Consulte su comprobante en: www.sunat.gob.pe', margin, doc.y, { width: printWidth, align: 'center' });
            doc.end();
        });
    }
    async sendMediaMessage(phone, base64OrUrl, caption, fileName = 'comprobante.pdf') {
        const formattedPhone = this.formatPhoneNumber(phone);
        if (!formattedPhone || !base64OrUrl)
            return null;
        const url = `${this.apiUrl.replace(/\/$/, '')}/message/sendMedia/${this.instanceName}`;
        this.logger.log(`Enviando archivo PDF de comprobante via Evolution API a ${formattedPhone}...`);
        try {
            const response = await axios_1.default.post(url, {
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
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    apikey: this.apiKey,
                },
                timeout: 20000,
            });
            this.logger.log(`PDF enviado con éxito por WhatsApp a ${formattedPhone}`);
            return response.data;
        }
        catch (error) {
            const errMsg = error?.response?.data?.message || error?.message || 'connect ECONNREFUSED';
            this.logger.warn(`Error al enviar archivo PDF por WhatsApp: ${errMsg}`);
            throw new common_1.BadRequestException(`No se pudo enviar por WhatsApp (${this.apiUrl}): Servidor Evolution API no disponible o no responde.`);
        }
    }
    async sendInvoiceMessage(sale, recipientPhone, companyInfo) {
        if (!recipientPhone)
            return null;
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
        let mediaPayload = sale?.pdfUrl;
        if (!mediaPayload) {
            try {
                const pdfBuffer = await this.generateReceiptPdfBuffer(sale, companyInfo);
                mediaPayload = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
            }
            catch (err) {
                this.logger.warn(`Error generando PDF buffer: ${err?.message}`);
            }
        }
        if (mediaPayload) {
            return this.sendMediaMessage(formattedPhone, mediaPayload, caption, `${serie}.pdf`);
        }
        return null;
    }
};
exports.WhatsappAdapter = WhatsappAdapter;
exports.WhatsappAdapter = WhatsappAdapter = WhatsappAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsappAdapter);
//# sourceMappingURL=whatsapp.adapter.js.map