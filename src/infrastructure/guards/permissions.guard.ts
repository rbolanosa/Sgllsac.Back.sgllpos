import { CanActivate, ExecutionContext, ForbiddenException, Injectable, RequestMethod, UnauthorizedException } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ProfileService } from '../../domain/services/profile.service';
import { isAllowed, ROUTE_RULES } from '../../domain/constants/permissions';

/** "PATCH sales/:id/void": sale de la definición de la ruta, no de la dirección que escribe el usuario */
export function routeKey(controller: any, handler: any): string {
  const first = (v: any) => (Array.isArray(v) ? v[0] : v) ?? '';
  const path = [first(Reflect.getMetadata(PATH_METADATA, controller)), first(Reflect.getMetadata(PATH_METADATA, handler))]
    .map((p) => String(p).replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
  return `${RequestMethod[Reflect.getMetadata(METHOD_METADATA, handler)]} ${path}`;
}

/** Permisos por perfil. Va después de la sesión y antes de los roles. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly profiles: ProfileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest();
    const access = await this.profiles.accessOf(Number(req.user?.id));
    if (!access || !access.active) throw new UnauthorizedException('Tu usuario está desactivado');
    // El rol vigente manda, aunque la sesión sea anterior al cambio
    req.user.role = access.role;
    if (!isAllowed(ROUTE_RULES[routeKey(context.getClass(), context.getHandler())], access.role, access.permissions)) {
      throw new ForbiddenException('Tu perfil no tiene permiso para esta acción');
    }
    return true;
  }
}
