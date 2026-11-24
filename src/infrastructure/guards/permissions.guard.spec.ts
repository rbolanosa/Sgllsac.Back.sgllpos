import * as fs from 'fs';
import * as path from 'path';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ADMIN_ONLY, cleanPermissions, isAllowed, MODULES, ROUTE_RULES, SYSTEM_PROFILES } from '../../domain/constants/permissions';
import { routeKey } from './permissions.guard';

const dir = path.join(__dirname, '../controllers');
const routes: string[] = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.controller.ts'))) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  for (const C of Object.values<any>(require(path.join(dir, f)))) {
    if (typeof C !== 'function' || Reflect.getMetadata(PATH_METADATA, C) === undefined) continue;
    for (const n of Object.getOwnPropertyNames(C.prototype)) {
      const h = C.prototype[n];
      if (typeof h !== 'function' || Reflect.getMetadata(METHOD_METADATA, h) === undefined) continue;
      if (Reflect.getMetadata(IS_PUBLIC_KEY, h) || Reflect.getMetadata(IS_PUBLIC_KEY, C)) continue;
      routes.push(routeKey(C, h));
    }
  }
}
const P = SYSTEM_PROFILES;
const can = (k: string, perfil: string) => isAllowed(ROUTE_RULES[k], 'cashier', P[perfil].permissions);

describe('permisos', () => {
  it('toda ruta tiene regla o es solo del administrador', () => {
    expect(routes.length).toBeGreaterThan(80);
    const sin = routes.filter((r) => !ROUTE_RULES[r] && !ADMIN_ONLY.includes(r.split(' ')[1].split('/')[0]));
    expect(sin).toEqual([]);
  });
  it('no hay reglas de rutas inexistentes ni de acciones que no existen', () => {
    expect(Object.keys(ROUTE_RULES).filter((r) => !routes.includes(r))).toEqual([]);
    const ok = new Set(MODULES.flatMap((m) => m.actions.map((a) => `${m.key}:${a}`)));
    expect(Object.values(ROUTE_RULES).flatMap((r) => (Array.isArray(r) ? r : [])).filter((r) => !ok.has(r))).toEqual([]);
  });
  it('el administrador puede todo; sin regla, nadie más', () => {
    expect(routes.every((r) => isAllowed(ROUTE_RULES[r], 'admin', {}))).toBe(true);
    expect(isAllowed(undefined, 'cashier', P.consulta.permissions)).toBe(false);
    expect(can('PUT users/:id', 'cajero')).toBe(false);
  });
  it('el cajero vende y cobra, pero no toca productos ni compras', () => {
    ['POST sales', 'POST customers', 'PUT customers/:id', 'GET products', 'GET categories', 'GET suppliers', 'POST caja/abrir',
      'POST receivables/:id/payments', 'PATCH quotes/:id/sold', 'PATCH sales/:id/void', 'POST whatsapp/send-voucher/:saleId']
      .forEach((r) => expect([r, can(r, 'cajero')]).toEqual([r, true]));
    ['PUT products/:id', 'DELETE customers/:id', 'POST stock-entries', 'PATCH products/:id/stock/add', 'GET purchase-orders']
      .forEach((r) => expect([r, can(r, 'cajero')]).toEqual([r, false]));
  });
  it('consulta no cambia nada', () => {
    expect(routes.filter((r) => !r.startsWith('GET') && can(r, 'consulta'))).toEqual(['POST sunat-docs/voids/refresh']);
  });
  it('descarta permisos inventados y los que no tienen "ver"', () => {
    expect(cleanPermissions({ users: { ver: true }, sales: { ver: false, eliminar: true }, pos: { ver: true, borrar: true } })).toEqual({ pos: { ver: true } });
  });
});
