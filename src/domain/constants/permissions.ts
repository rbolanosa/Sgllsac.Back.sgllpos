export type Action = 'ver' | 'crear' | 'editar' | 'eliminar';
export type Permissions = Record<string, Partial<Record<Action, boolean>>>;
export const ACTIONS: Action[] = ['ver', 'crear', 'editar', 'eliminar'];

/** Módulos que se pueden dar a un perfil. Empresa, establecimientos, usuarios y perfiles son solo del administrador. */
export const MODULES: { key: string; name: string; category: string; actions: Action[] }[] = [
  { key: 'dashboard', name: 'Inicio', category: 'Principal', actions: ['ver'] },
  { key: 'caja', name: 'Caja', category: 'Principal', actions: ['ver', 'crear'] },
  { key: 'pos', name: 'Punto de venta', category: 'Ventas', actions: ['ver', 'crear'] },
  { key: 'sales', name: 'Historial de ventas', category: 'Ventas', actions: ['ver', 'eliminar'] },
  { key: 'comprobantes', name: 'Comprobantes SUNAT', category: 'Ventas', actions: ['ver', 'crear', 'eliminar'] },
  { key: 'quotes', name: 'Cotizaciones', category: 'Ventas', actions: ['ver', 'crear', 'editar'] },
  { key: 'receivables', name: 'Cuentas por cobrar', category: 'Ventas', actions: ['ver', 'crear'] },
  { key: 'guias', name: 'Guías de remisión', category: 'Ventas', actions: ['ver', 'crear'] },
  { key: 'customers', name: 'Clientes', category: 'Ventas', actions: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'products', name: 'Productos', category: 'Inventario', actions: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'inventory', name: 'Stock', category: 'Inventario', actions: ['ver', 'editar'] },
  { key: 'stock_entry', name: 'Ingreso por factura', category: 'Inventario', actions: ['ver', 'crear'] },
  { key: 'categories', name: 'Categorías', category: 'Inventario', actions: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'purchase_orders', name: 'Órdenes de compra', category: 'Compras', actions: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'suppliers', name: 'Proveedores', category: 'Compras', actions: ['ver', 'crear', 'editar', 'eliminar'] },
  { key: 'sire', name: 'Compras en SUNAT', category: 'Compras', actions: ['ver', 'crear'] },
  { key: 'reports', name: 'Reportes', category: 'Administración', actions: ['ver'] },
  { key: 'whatsapp', name: 'WhatsApp', category: 'Administración', actions: ['ver', 'crear'] },
];

/** Deja solo módulos y acciones conocidos; sin "ver" no hay nada más */
export function cleanPermissions(input: any): Permissions {
  const out: Permissions = {};
  for (const m of MODULES) {
    const p = input?.[m.key];
    if (p?.ver !== true) continue;
    out[m.key] = Object.fromEntries(m.actions.filter((a) => p[a] === true).map((a) => [a, true]));
  }
  return out;
}

const grant = (spec: Record<string, string>): Permissions => {
  const code: Record<string, Action> = { v: 'ver', c: 'crear', e: 'editar', x: 'eliminar' };
  return cleanPermissions(Object.fromEntries(Object.entries(spec).map(([k, s]) =>
    [k, Object.fromEntries([...s].map((l) => [code[l], true]))])));
};

/** Perfiles de fábrica. También son el respaldo de quien no tiene un perfil asignado. */
export const SYSTEM_PROFILES: Record<string, { name: string; description: string; permissions: Permissions }> = {
  cajero: {
    name: 'Cajero / Vendedor',
    description: 'Vende, cobra, cotiza y atiende clientes.',
    // Anular sigue pidiendo la clave de autorización
    permissions: grant({
      dashboard: 'v', caja: 'vc', pos: 'vc', sales: 'vx', comprobantes: 'vcx', quotes: 'vce', receivables: 'vc',
      guias: 'vc', customers: 'vce', products: 'v', inventory: 'v',
    }),
  },
  almacenero: {
    name: 'Almacenero / Inventario',
    description: 'Productos, stock, ingresos y compras.',
    permissions: grant({
      products: 'vce', inventory: 've', stock_entry: 'vc', categories: 'vce', purchase_orders: 'vce', suppliers: 'vce', sire: 'v',
    }),
  },
  consulta: {
    name: 'Consulta',
    description: 'Solo puede ver, sin cambiar nada.',
    permissions: Object.fromEntries(MODULES.map((m) => [m.key, { ver: true }])),
  },
};
export const DEFAULT_PROFILE: Record<string, string> = { cashier: 'cajero', viewer: 'consulta' };

/** '*' = cualquier usuario con sesión. 'admin' = solo administrador. Si no, basta cumplir uno. */
export type Rule = '*' | 'admin' | string[];

/** Cada ruta del servidor. La que no esté aquí queda solo para el administrador. */
export const ROUTE_RULES: Record<string, Rule> = {
  'GET auth/me': '*',
  'GET caja/activa': '*',
  'GET caja/resumen': ['caja:ver'], 'GET caja/historial': ['caja:ver'], 'GET caja/sesion/:id': ['caja:ver'],
  'POST caja/abrir': ['caja:crear'], 'POST caja/movimiento': ['caja:crear'], 'POST caja/cerrar': ['caja:crear'],
  'GET categories': ['categories:ver', 'products:ver', 'pos:ver'], 'GET categories/:id': ['categories:ver', 'products:ver'],
  'POST categories': ['categories:crear'], 'PUT categories/:id': ['categories:editar'], 'DELETE categories/:id': ['categories:eliminar'],
  'GET company-settings': '*',
  'GET customers': ['customers:ver', 'pos:ver', 'quotes:ver', 'guias:ver'],
  'GET customers/lookup/:doc': ['customers:crear', 'pos:crear', 'quotes:crear', 'quotes:editar', 'guias:crear'],
  'GET customers/:id': ['customers:ver', 'pos:ver', 'quotes:ver', 'guias:ver'],
  'POST customers': ['customers:crear', 'pos:crear'], 'PUT customers/:id': ['customers:editar', 'pos:crear'],
  'DELETE customers/:id': ['customers:eliminar'],
  'GET dashboard': ['dashboard:ver'],
  'GET establishments': '*', 'GET establishments/series': '*',
  'GET guias-remision': ['guias:ver'], 'GET guias-remision/:id': ['guias:ver'],
  'POST guias-remision': ['guias:crear'], 'POST guias-remision/:id/resend-sunat': ['guias:crear'],
  'GET products': ['products:ver', 'inventory:ver', 'pos:ver', 'quotes:ver', 'stock_entry:ver', 'purchase_orders:ver', 'categories:ver'],
  'GET products/low-stock': '*',
  'GET products/excel/template': ['products:crear'], 'POST products/excel/import': ['products:crear'],
  'GET products/barcode/:barcode': ['products:ver', 'pos:ver'],
  'GET products/:id': ['products:ver', 'inventory:ver', 'pos:ver'],
  'POST products': ['products:crear'], 'PUT products/:id': ['products:editar', 'inventory:editar'], 'DELETE products/:id': ['products:eliminar'],
  'GET products/:id/batches': ['products:ver', 'inventory:ver'],
  'PATCH products/:id/stock/add': ['inventory:editar'], 'PATCH products/:id/stock/subtract': ['inventory:editar'],
  'GET purchase-orders': ['purchase_orders:ver'], 'GET purchase-orders/:id': ['purchase_orders:ver'],
  'POST purchase-orders': ['purchase_orders:crear'], 'PATCH purchase-orders/:id/receive': ['purchase_orders:editar'],
  'PATCH purchase-orders/:id/cancel': ['purchase_orders:eliminar'],
  'GET quotes': ['quotes:ver'], 'GET quotes/summary': ['quotes:ver'], 'GET quotes/:id': ['quotes:ver'],
  'POST quotes': ['quotes:crear'], 'PUT quotes/:id': ['quotes:editar'], 'PATCH quotes/:id/status': ['quotes:editar'],
  'PATCH quotes/:id/sold': ['pos:crear'],
  'GET receivables': ['receivables:ver', 'pos:crear'], 'GET receivables/:id': ['receivables:ver', 'pos:crear'],
  'GET receivables/summary': ['receivables:ver'], 'POST receivables/:id/payments': ['receivables:crear'],
  'GET sales': ['sales:ver', 'comprobantes:ver', 'reports:ver', 'guias:ver'],
  'GET sales/summary': ['reports:ver', 'sales:ver'],
  'GET sales/:id': ['sales:ver', 'comprobantes:ver', 'guias:ver', 'pos:ver'],
  'GET sales/:id/pdf-token': ['sales:ver', 'comprobantes:ver', 'receivables:ver', 'pos:ver'],
  'GET sales/:id/pdf': ['sales:ver', 'comprobantes:ver', 'receivables:ver', 'pos:ver'],
  'GET sales/:id/xml': ['comprobantes:ver'],
  'POST sales': ['pos:crear'], 'POST sales/credit-note': ['comprobantes:crear'],
  'PATCH sales/:id/void': ['sales:eliminar', 'comprobantes:eliminar'],
  'POST sales/:id/send-whatsapp': ['pos:crear', 'comprobantes:crear', 'whatsapp:crear'],
  'POST sales/:id/resend-sunat': ['comprobantes:crear'],
  'GET stock-entries': ['stock_entry:ver'], 'GET stock-entries/:id': ['stock_entry:ver'],
  'POST stock-entries/preview': ['stock_entry:crear'], 'POST stock-entries': ['stock_entry:crear'],
  'GET sunat-docs/sales/:id/void': ['comprobantes:ver'], 'GET sunat-docs/voids': ['comprobantes:ver'],
  'POST sunat-docs/voids/refresh': ['comprobantes:ver'],
  'POST sunat-docs/sales/:id/void': ['comprobantes:eliminar'], 'POST sunat-docs/sales/:id/debit-note': ['comprobantes:crear'],
  'GET sunat-docs/sales-register': ['comprobantes:ver'],
  'POST sunat-docs/sire/activate': 'admin', 'POST sunat-docs/sire/:periodo/request': ['sire:crear'],
  'GET sunat-docs/sire/:periodo/tickets': ['sire:ver'], 'GET sunat-docs/sire/:periodo/compare': ['sire:ver'],
  'GET suppliers': ['suppliers:ver', 'products:ver', 'inventory:ver', 'purchase_orders:ver', 'pos:ver'],
  'GET suppliers/:id': ['suppliers:ver'],
  'POST suppliers': ['suppliers:crear'], 'PUT suppliers/:id': ['suppliers:editar'], 'DELETE suppliers/:id': ['suppliers:eliminar'],
  'GET whatsapp/status': ['whatsapp:ver'], 'GET whatsapp/contacts': ['whatsapp:ver'], 'POST whatsapp/send-text': ['whatsapp:crear'],
  'POST whatsapp/send-voucher/:saleId': ['pos:crear', 'comprobantes:crear', 'whatsapp:crear'],
};
export const ADMIN_ONLY = ['company-settings', 'establishments', 'users', 'profiles'];

export function isAllowed(rule: Rule | undefined, role: string, perms: Permissions): boolean {
  if (role === 'admin' || rule === '*') return true;
  if (!rule || rule === 'admin') return false;
  return (rule as string[]).some((r) => {
    const [mod, action] = r.split(':');
    return perms[mod]?.ver === true && perms[mod]?.[action as Action] === true;
  });
}
