import { Repository } from 'typeorm';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from '../../application/dtos/supplier.dto';
export declare class SupplierController {
    private readonly supplierRepo;
    constructor(supplierRepo: Repository<SupplierEntity>);
    findAll(search?: string, page?: number, limit?: number): Promise<{
        data: SupplierEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<SupplierEntity>;
    create(dto: CreateSupplierDto): Promise<SupplierEntity>;
    update(id: number, dto: UpdateSupplierDto): Promise<SupplierEntity>;
    remove(id: number): Promise<SupplierEntity>;
}
