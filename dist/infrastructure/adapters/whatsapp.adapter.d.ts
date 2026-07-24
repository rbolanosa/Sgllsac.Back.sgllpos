import { ConfigService } from '@nestjs/config';
export declare class WhatsappAdapter {
    private configService;
    private readonly logger;
    private apiUrl;
    private apiKey;
    private instanceName;
    constructor(configService: ConfigService);
    private formatPhoneNumber;
    private numLetras;
    private formatShortSerie;
    generateReceiptPdfBuffer(sale: any, companyInfo: any): Promise<Buffer>;
    sendMediaMessage(phone: string, base64OrUrl: string, caption: string, fileName?: string): Promise<any>;
    sendInvoiceMessage(sale: any, recipientPhone: string, companyInfo?: any): Promise<any>;
}
