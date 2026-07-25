import { Repository } from 'typeorm';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../../application/dtos/customer.dto';
export declare class CustomerController {
    private readonly customerRepo;
    constructor(customerRepo: Repository<CustomerEntity>);
    findAll(search?: string, page?: number, limit?: number): Promise<{
        data: CustomerEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    lookupDoc(doc: string): Promise<{
        source: string;
        data: CustomerEntity;
    } | {
        source: string;
        data: {
            nit: string;
            name: any;
            address: any;
        };
    }>;
    findOne(id: number): Promise<CustomerEntity>;
    create(dto: CreateCustomerDto): Promise<CustomerEntity>;
    update(id: number, dto: UpdateCustomerDto): Promise<CustomerEntity>;
    remove(id: number): Promise<CustomerEntity>;
}
