"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WhatsappMultiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappMultiService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_settings_entity_1 = require("../../domain/entities/company-settings.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const whatsapp_adapter_1 = require("../../infrastructure/adapters/whatsapp.adapter");
let WhatsappMultiService = WhatsappMultiService_1 = class WhatsappMultiService {
    constructor(companyRepo, customerRepo, saleRepo, whatsappAdapter) {
        this.companyRepo = companyRepo;
        this.customerRepo = customerRepo;
        this.saleRepo = saleRepo;
        this.whatsappAdapter = whatsappAdapter;
        this.logger = new common_1.Logger(WhatsappMultiService_1.name);
    }
    async getCompanyConfig() {
        let company = await this.companyRepo.findOne({ where: { id: 1 } });
        if (!company) {
            company = await this.companyRepo.findOne({ where: {} });
        }
        const baseUrl = (company?.whatsappApiUrl || 'https://apiwatsapp-production.up.railway.app').replace(/\/$/, '');
        const companyId = company?.whatsappCompanyId || 'empresa_demo';
        return { baseUrl, companyId, company };
    }
    async getStatus() {
        const { baseUrl, companyId } = await this.getCompanyConfig();
        const headers = { 'x-company-id': companyId };
        let statusData = {};
        try {
            const response = await axios_1.default.get(`${baseUrl}/status`, { headers, timeout: 10000 });
            statusData = response.data ?? {};
        }
        catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Error de conexión con la API de WhatsApp';
            return { connected: false, companyId, baseUrl, error: msg };
        }
        const isConnected = statusData.connected === true || statusData.status === 'open' || statusData.state === 'open';
        if (!isConnected) {
            try {
                const qrRes = await axios_1.default.get(`${baseUrl}/qr`, {
                    params: { companyId },
                    headers,
                    timeout: 10000,
                    responseType: 'text',
                });
                const html = typeof qrRes.data === 'string' ? qrRes.data : JSON.stringify(qrRes.data);
                const match = html.match(/src="(data:image\/[^;]+;base64,[^"]+)"/);
                if (match && match[1]) {
                    statusData.qrcode = match[1];
                    this.logger.log(`QR base64 extraído correctamente para empresa: ${companyId}`);
                }
                else {
                    this.logger.warn(`No se encontró imagen base64 en la respuesta del QR`);
                }
            }
            catch (e) {
                this.logger.warn(`No se pudo obtener QR: ${e?.message}`);
            }
        }
        return {
            companyId,
            baseUrl,
            connected: isConnected,
            ...statusData,
        };
    }
    async sendText(to, message) {
        const { baseUrl, companyId } = await this.getCompanyConfig();
        const cleanPhone = to.replace(/\D/g, '');
        const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
        try {
            const response = await axios_1.default.post(`${baseUrl}/send-text`, { to: phone, message }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-company-id': companyId,
                },
                timeout: 15000,
            });
            return response.data;
        }
        catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Error enviando mensaje';
            throw new common_1.BadRequestException(`No se pudo enviar el mensaje por WhatsApp: ${msg}`);
        }
    }
    async sendMedia(to, pdfBase64, caption, fileName) {
        const { baseUrl, companyId } = await this.getCompanyConfig();
        const cleanPhone = to.replace(/\D/g, '');
        const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
        const form = new form_data_1.default();
        form.append('to', phone);
        form.append('caption', caption);
        if (pdfBase64) {
            const pdfBuffer = Buffer.from(pdfBase64, 'base64');
            form.append('file', pdfBuffer, { filename: fileName, contentType: 'application/pdf' });
        }
        try {
            const response = await axios_1.default.post(`${baseUrl}/send-media`, form, {
                headers: {
                    ...form.getHeaders(),
                    'x-company-id': companyId,
                },
                timeout: 30000,
            });
            this.logger.log(`PDF enviado vía Railway WhatsApp API a ${phone}`);
            return response.data;
        }
        catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Error enviando PDF';
            this.logger.error(`Error sendMedia: ${msg}`);
            throw new common_1.BadRequestException(`No se pudo enviar el comprobante por WhatsApp: ${msg}`);
        }
    }
    async sendVoucher(saleId, recipientPhone) {
        const { baseUrl, companyId, company } = await this.getCompanyConfig();
        const sale = await this.saleRepo.findOne({
            where: { id: saleId },
            relations: { customer: true, items: true },
        });
        if (!sale) {
            throw new common_1.BadRequestException(`Comprobante con ID ${saleId} no encontrado`);
        }
        const phoneToUse = recipientPhone || sale.customer?.phone;
        if (!phoneToUse) {
            throw new common_1.BadRequestException('El cliente no tiene un número telefónico registrado');
        }
        const cleanPhone = phoneToUse.replace(/\D/g, '');
        const phone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
        const pdfBuffer = await this.whatsappAdapter.generateReceiptPdfBuffer(sale, company);
        const fileName = `${sale.invoiceNumber || 'COMPROBANTE'}.pdf`;
        const isNota = sale.documentType === 'nota_venta';
        const docLabel = isNota ? 'Nota de Venta' : sale.documentType === 'factura' ? 'Factura Electrónica' : 'Boleta Electrónica';
        const custName = sale.customer?.name || 'Cliente';
        const totalStr = Number(sale.totalAmount || 0).toFixed(2);
        const caption = `*${company?.nombreComercial || company?.razonSocial || 'EMPRESA'}*\nEstimado(a) *${custName}*, adjuntamos su *${docLabel}* N° ${sale.invoiceNumber}.\n\n• Total: S/ ${totalStr}\n¡Gracias por su preferencia!`;
        try {
            const form = new form_data_1.default();
            form.append('to', phone);
            form.append('caption', caption);
            form.append('file', pdfBuffer, {
                filename: fileName,
                contentType: 'application/pdf',
            });
            const response = await axios_1.default.post(`${baseUrl}/send-media`, form, {
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
        }
        catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Error al enviar comprobante vía Railway WhatsApp API';
            this.logger.error(`Error enviando comprobante #${saleId}: ${msg}`);
            throw new common_1.BadRequestException(`Falló el envío del comprobante por WhatsApp: ${msg}`);
        }
    }
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
};
exports.WhatsappMultiService = WhatsappMultiService;
exports.WhatsappMultiService = WhatsappMultiService = WhatsappMultiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_settings_entity_1.CompanySettingsEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(sale_entity_1.SaleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        whatsapp_adapter_1.WhatsappAdapter])
], WhatsappMultiService);
//# sourceMappingURL=whatsapp-multi.service.js.map