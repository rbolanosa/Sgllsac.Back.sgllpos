import { AuthService } from '../../domain/services/auth.service';
declare class LoginDto {
    email: string;
    password: string;
}
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: import("../../domain/entities/user.entity").UserRole;
        };
    }>;
    status(): {
        status: string;
        service: string;
    };
}
export {};
