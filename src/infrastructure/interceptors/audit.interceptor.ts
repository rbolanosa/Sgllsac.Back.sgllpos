import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, from, mergeMap, throwError } from 'rxjs';
import { routeKey } from '../guards/permissions.guard';
import { AuditService, actionOf, cleanDetail } from '../../domain/services/audit.service';

/** Registra quién hizo qué. Espera el guardado: en Vercel lo que queda pendiente tras responder se pierde. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (context.getType() !== 'http') return next.handle();
    const route = routeKey(context.getClass(), context.getHandler());
    if (!actionOf(route)) return next.handle();

    const req = context.switchToHttp().getRequest();
    const id: string | undefined = req.params?.id;
    const before = await this.audit.snapshot(route, id);

    const save = async (ok: boolean, res: any, error?: any) => {
      const isLogin = route === 'POST auth/login';
      // Los intentos fallidos de ingreso no se guardan: cualquiera podría llenar la tabla
      if (isLogin && !ok) return;
      const changes = before && ok ? AuditService.diff(before, await this.audit.snapshot(route, id)) : {};
      const number = res?.invoiceNumber ?? res?.numeroCompleto ?? res?.number ?? before?.invoice_number ?? before?.name ?? res?.name;
      const userId = isLogin ? res?.user?.id : req.user?.id;
      await this.audit.write({
        userId: Number(userId) || null,
        userName: isLogin ? res?.user?.name ?? null : null,
        route, ok,
        target: number ? String(number) : id ?? (res?.id ? `#${res.id}` : null),
        detail: isLogin ? null : {
          ...cleanDetail(req.body),
          ...(Object.keys(changes).length ? { cambios: changes } : {}),
          ...(error ? { error: [error?.response?.message ?? error?.message ?? error].flat().join(' · ').slice(0, 300) } : {}),
        },
        ip: String(req.headers?.['x-forwarded-for'] ?? req.ip ?? '').split(',')[0].trim() || null,
      });
    };

    return next.handle().pipe(
      mergeMap((res) => from(save(true, res).catch(() => undefined).then(() => res))),
      catchError((e) => from(save(false, null, e).catch(() => undefined)).pipe(mergeMap(() => throwError(() => e)))),
    );
  }
}
