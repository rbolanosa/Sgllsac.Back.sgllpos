import { Repository } from 'typeorm';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/dtos/category.dto';
export declare class CategoryController {
    private readonly categoryRepo;
    constructor(categoryRepo: Repository<CategoryEntity>);
    findAll(search?: string, page?: number, limit?: number): Promise<CategoryEntity[] | {
        data: CategoryEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<CategoryEntity>;
    create(dto: CreateCategoryDto): Promise<CategoryEntity>;
    update(id: number, dto: UpdateCategoryDto): Promise<CategoryEntity>;
    remove(id: number): Promise<CategoryEntity>;
}
