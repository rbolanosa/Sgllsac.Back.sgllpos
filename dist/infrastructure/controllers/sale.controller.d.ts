import { SaleService } from '../../domain/services/sale.service';
import { CreateSaleDto, VoidSaleDto } from '../../application/dtos/sale.dto';
import { SaleStatus } from '../../domain/entities/sale.entity';
export declare class SaleController {
    private readonly saleService;
    constructor(saleService: SaleService);
    findAll(page?: number, limit?: number, status?: SaleStatus, from?: string, to?: string, documentType?: string): Promise<{
        data: import("../../domain/entities/sale.entity").SaleEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    getSummary(from: string, to: string): Promise<{
        totalSales: number;
        totalRevenue: number;
        totalTax: number;
        avgTicket: number;
    }>;
    findOne(id: number): Promise<import("../../domain/entities/sale.entity").SaleEntity>;
    create(dto: CreateSaleDto): Promise<import("../../domain/entities/sale.entity").SaleEntity>;
    void(id: number, dto: VoidSaleDto): Promise<import("../../domain/entities/sale.entity").SaleEntity>;
    createCreditNote(body: {
        originalSaleId: number;
        motivo: string;
        descripcion: string;
    }): Promise<import("../../domain/entities/sale.entity").SaleEntity>;
}
