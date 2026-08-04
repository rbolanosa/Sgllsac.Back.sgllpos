import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { WhatsappAdapter } from '../../infrastructure/adapters/whatsapp.adapter';

@Injectable()
export class WhatsappMultiService {
  private readonly logger = new Logger(WhatsappMultiService.name);

  constructor(
    @InjectRepository(CompanySettingsEntity)
    private readonly companyRepo: Repository<CompanySettingsEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
    @InjectRepository(SaleEntity)
    private readonly saleRepo: Repository<SaleEntity>,
    private readonly whatsappAdapter: WhatsappAdapter,
  ) {}

  private async getCompanyConfig() {
    let company = await this.companyRepo.findOne({ where: { id: 1 } });
    if (!company) {
      company = await this.companyRepo.findOne({ where: {} });
    }
    const baseUrl = (company?.whatsappApiUrl || 'https://apiwatsapp-production.up.railway.app').replace(/\/$/, '');
    const companyId = company?.whatsappCompanyId || 'empresa_demo';
    return { baseUrl, companyId, company };
  }

  /**
   * Check connection status of current company
   * Request GET /status with x-company-id header
   */
  async getStatus() {
    const { baseUrl, companyId } = await this.getCompanyConfig();
    try {
      const response = await axios.get(`${baseUrl}/status`, {
        headers: { 'x-company-id': companyId },
        timeout: 10000,
      });
      return {
        companyId,
        baseUrl,
        ...response.data,
      };
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error de conexión con la API de WhatsApp';
      return {
        connected: false,
        companyId,
        baseUrl,
        error: msg,
        status: error?.response?.status || 500,
      };
    }
  }

  /**
   * Send single text message
   * POST /send-text
   */
  async sendText(to: string, message: string) {
    const { baseUrl, companyId } = await this.getCompanyConfig();
    const cleanPhone = to.replace(/\D/g, '');
    const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

    try {
      const response = await axios.post(
        `${baseUrl}/send-text`,
        { to: phone, message },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-company-id': companyId,
          },
          timeout: 15000,
        },
      );
      return response.data;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error enviando mensaje';
      throw new BadRequestException(`No se pudo enviar el mensaje por WhatsApp: ${msg}`);
    }
  }

  /**
   * Send voucher/invoice file PDF to customer
   * POST /send-media via multipart/form-data
   */
  async sendVoucher(saleId: number, recipientPhone?: string) {
    const { baseUrl, companyId, company } = await this.getCompanyConfig();
    
    // Find sale and customer
    const sale = await this.saleRepo.findOne({
      where: { id: saleId },
      relations: { customer: true, items: true },
    });

    if (!sale) {
      throw new BadRequestException(`Comprobante con ID ${saleId} no encontrado`);
    }

    const phoneToUse = recipientPhone || sale.customer?.phone;
    if (!phoneToUse) {
      throw new BadRequestException('El cliente no tiene un número telefónico registrado');
    }

    const cleanPhone = phoneToUse.replace(/\D/g, '');
    const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;

    // Generate PDF Buffer
    const pdfBuffer = await this.whatsappAdapter.generateReceiptPdfBuffer(sale, company);
    const fileName = `${sale.invoiceNumber || 'COMPROBANTE'}.pdf`;

    const isNota = sale.documentType === 'nota_venta';
    const docLabel = isNota ? 'Nota de Venta' : sale.documentType === 'factura' ? 'Factura Electrónica' : 'Boleta Electrónica';
    const custName = sale.customer?.name || 'Cliente';
    const totalStr = Number(sale.totalAmount || 0).toFixed(2);
    const caption = `*${company?.nombreComercial || company?.razonSocial || 'EMPRESA'}*\nEstimado(a) *${custName}*, adjuntamos su *${docLabel}* N° ${sale.invoiceNumber}.\n\n• Total: S/ ${totalStr}\n¡Gracias por su preferencia!`;

    try {
      const form = new FormData();
      form.append('to', phone);
      form.append('caption', caption);
      form.append('file', pdfBuffer, {
        filename: fileName,
        contentType: 'application/pdf',
      });

      const response = await axios.post(`${baseUrl}/send-media`, form, {
        headers: {
          ...form.getHeaders(),
          'x-company-id': companyId,
        },
        timeout: 30000,
      });

      return {
        success: true,
        message: `Comprobante ${sale.invoiceNumber} enviado con éxito a ${phone}`,
        apiResponse: response.data,
      };
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al enviar comprobante vía Railway WhatsApp API';
      this.logger.error(`Error enviando comprobante #${saleId}: ${msg}`);
      throw new BadRequestException(`Falló el envío del comprobante por WhatsApp: ${msg}`);
    }
  }

  /**
   * Get contacts list from local customer table
   */
  async getContacts() {
    const customers = await this.customerRepo.find({
      order: { name: 'ASC' },
    });
    return customers.map(c => ({
      id: c.id,
      name: c.name,
      nit: c.nit,
      phone: c.phone,
      email: c.email,
      address: c.address,
      hasPhone: !!(c.phone && c.phone.replace(/\D/g, '').length >= 9),
    }));
  }
}
