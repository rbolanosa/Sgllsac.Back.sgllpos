import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { UpdateCompanySettingsDto } from '../../application/dto/company-settings.dto';
export declare class CompanySettingsService {
    private readonly repo;
    constructor(repo: Repository<CompanySettingsEntity>);
    get(): Promise<CompanySettingsEntity>;
    update(dto: UpdateCompanySettingsDto): Promise<CompanySettingsEntity>;
    nextInvoiceNumber(type: 'factura' | 'boleta' | 'nota_venta', manager?: any): Promise<string>;
}
