import { UserService } from '../../domain/services/user.service';
import { CreateUserDto, UpdateUserDto } from '../../application/dto/user.dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    findAll(): Promise<import("../../domain/entities/user.entity").UserEntity[]>;
    findOne(id: number): Promise<import("../../domain/entities/user.entity").UserEntity>;
    create(dto: CreateUserDto): Promise<{
        id: number;
        name: string;
        email: string;
        role: import("../../domain/entities/user.entity").UserRole;
        isActive: boolean;
        establishmentId: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: number, dto: UpdateUserDto): Promise<{
        id: number;
        name: string;
        email: string;
        role: import("../../domain/entities/user.entity").UserRole;
        isActive: boolean;
        establishmentId: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number): Promise<{
        message: string;
    }>;
}
