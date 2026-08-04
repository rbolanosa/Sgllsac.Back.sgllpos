import { Repository, DataSource } from 'typeorm';
import { SaleEntity, SaleStatus } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';
import { CreateSaleDto, VoidSaleDto } from '../../application/dtos/sale.dto';
import { CompanySettingsService } from './company-settings.service';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';
import { WhatsappAdapter } from '../../infrastructure/adapters/whatsapp.adapter';
import { WhatsappMultiService } from '../../infrastructure/services/whatsapp-multi.service';
import { CashService } from './cash.service';
export declare class SaleService {
    private readonly saleRepo;
    private readonly saleItemRepo;
    private readonly productRepo;
    private readonly customerRepo;
    private readonly movementRepo;
    private readonly dataSource;
    private readonly companySettings;
    private readonly facturacionAdapter;
    private readonly whatsappAdapter;
    private readonly whatsappMulti;
    private readonly cashService;
    private readonly logger;
    constructor(saleRepo: Repository<SaleEntity>, saleItemRepo: Repository<SaleItemEntity>, productRepo: Repository<ProductEntity>, customerRepo: Repository<CustomerEntity>, movementRepo: Repository<InventoryMovementEntity>, dataSource: DataSource, companySettings: CompanySettingsService, facturacionAdapter: FacturacionAdapter, whatsappAdapter: WhatsappAdapter, whatsappMulti: WhatsappMultiService, cashService: CashService);
    findAll(filters?: {
        page?: number;
        limit?: number;
        status?: SaleStatus;
        from?: string;
        to?: string;
        documentType?: string;
    }): Promise<{
        data: SaleEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: number): Promise<SaleEntity>;
    create(dto: CreateSaleDto, cashierId?: number): Promise<SaleEntity>;
    private sendToApisunat;
    createCreditNote(originalId: number, reason: string, description: string): Promise<SaleEntity>;
    private sendCreditNoteToApisunat;
    resendSunat(saleId: number): Promise<any>;
    getXml(saleId: number): Promise<{
        buffer: Buffer;
        filename: string;
    }>;
    fixIncorrectRefundedStatuses(): Promise<void>;
    voidSale(id: number, dto: VoidSaleDto, performedBy?: number): Promise<SaleEntity>;
    getSalesSummary(from: string, to: string): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalTax: number;
        avgTicket: number;
    }>;
    private generateInvoiceNumber;
    sendWhatsappMessage(id: number, phone: string): Promise<any>;
    generatePdfBuffer(id: number): Promise<{
        buffer: Buffer;
        fileName: string;
    }>;
    getSecurePdfToken(saleId: number): string;
    verifyPdfToken(token: string): number | null;
}
