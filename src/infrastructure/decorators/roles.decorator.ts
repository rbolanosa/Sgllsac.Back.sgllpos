import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../domain/entities/user.entity';

export const ROLES_KEY = 'roles';
/** Restringe una ruta o controlador a los roles indicados */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
