import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';
export declare class CompanySettingsService {
    private readonly repo;
    private readonly httpService;
    constructor(repo: Repository<CompanySettingsEntity>, httpService: HttpService);
    get(): Promise<CompanySettingsEntity>;
    update(dto: UpdateCompanySettingsDto): Promise<CompanySettingsEntity>;
    registerSunatApi(certFile: Express.Multer.File, certPassword?: string): Promise<{
        message: string;
        apiKey: string;
        apiSecret: string;
    }>;
    syncLogoToApisunat(logoFile: Express.Multer.File): Promise<void>;
    private normalizeCertificatePath;
    nextInvoiceNumber(type: 'factura' | 'boleta' | 'nota_venta', manager?: any): Promise<string>;
}
