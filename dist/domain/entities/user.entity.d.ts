export declare enum UserRole {
    ADMIN = "admin",
    CASHIER = "cashier",
    VIEWER = "viewer"
}
export declare class UserEntity {
    id: number;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
