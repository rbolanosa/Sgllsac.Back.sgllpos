import { UserRole } from '../../domain/entities/user.entity';
export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    establishmentId?: number;
}
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    establishmentId?: number;
    isActive?: boolean;
}
