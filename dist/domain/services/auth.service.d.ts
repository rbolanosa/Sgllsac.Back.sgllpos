import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../entities/user.entity';
export declare class AuthService {
    private readonly userRepo;
    private readonly jwtService;
    constructor(userRepo: Repository<UserEntity>, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        token: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: import("../entities/user.entity").UserRole;
        };
    }>;
    validateById(id: number): Promise<UserEntity | null>;
}
