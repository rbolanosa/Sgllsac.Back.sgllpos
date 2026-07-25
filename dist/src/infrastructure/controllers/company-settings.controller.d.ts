import { CompanySettingsService } from '../../domain/services/company-settings.service';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';
export declare class CompanySettingsController {
    private readonly service;
    constructor(service: CompanySettingsService);
    get(): Promise<import("../../domain/entities/company-settings.entity").CompanySettingsEntity>;
    update(dto: UpdateCompanySettingsDto): Promise<import("../../domain/entities/company-settings.entity").CompanySettingsEntity>;
    uploadLogo(file: Express.Multer.File): Promise<{
        logoUrl: string;
        message: string;
    }>;
    registerSunatApi(file: Express.Multer.File, contrasenaCertificado?: string): Promise<{
        message: string;
        apiKey: string;
        apiSecret: string;
    }>;
}
