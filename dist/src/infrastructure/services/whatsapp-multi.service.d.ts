import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { WhatsappAdapter } from '../../infrastructure/adapters/whatsapp.adapter';
export declare class WhatsappMultiService {
    private readonly companyRepo;
    private readonly customerRepo;
    private readonly saleRepo;
    private readonly whatsappAdapter;
    private readonly logger;
    constructor(companyRepo: Repository<CompanySettingsEntity>, customerRepo: Repository<CustomerEntity>, saleRepo: Repository<SaleEntity>, whatsappAdapter: WhatsappAdapter);
    private getCompanyConfig;
    getStatus(): Promise<any>;
    sendText(to: string, message: string): Promise<any>;
    sendMedia(to: string, pdfBase64: string | null, caption: string, fileName: string): Promise<any>;
    sendVoucher(saleId: number, recipientPhone?: string): Promise<{
        success: boolean;
        message: string;
        apiResponse: any;
    }>;
    getContacts(): Promise<{
        id: number;
        name: string;
        nit: string;
        phone: string;
        email: string;
        address: string;
        hasPhone: boolean;
    }[]>;
}
