import { actionOf, AuditService, AUDITED, cleanDetail } from './audit.service';
import { ROUTE_RULES } from '../constants/permissions';

describe('historial de acciones', () => {
  it('no guarda claves ni listas completas', () => {
    expect(cleanDetail({ name: 'A', password: 'x', pin: '1', sunatApiKey: 'k', claveSol: 'c', items: [1, 2], o: { a: 1 } }))
      .toEqual({ name: 'A', items: '2 elementos' });
  });
  it('registra solo lo que cambió', () => {
    expect(AuditService.diff({ price: '1.00', name: 'A' }, { price: '2.00', name: 'A' })).toEqual({ price: ['1.00', '2.00'] });
  });
  it('un fallo del historial no interrumpe la operación', async () => {
    const s = new AuditService({ query: async () => { throw new Error('sin tabla'); } } as any);
    await expect(s.write({ userId: 1, userName: null, route: 'POST sales', target: null, ok: true, detail: null, ip: null })).resolves.toBeUndefined();
    await expect(s.snapshot('PUT products/:id', '1')).resolves.toBeNull();
  });
  it('todo cambio queda registrado, salvo los auxiliares', () => {
    const skip = ['POST stock-entries/preview', 'POST sunat-docs/voids/refresh', 'POST sunat-docs/sire/activate', 'POST sunat-docs/sire/:periodo/request',
      'PATCH quotes/:id/sold', 'POST sales/:id/send-whatsapp', 'POST whatsapp/send-text', 'POST whatsapp/send-voucher/:saleId'];
    const missing = Object.keys(ROUTE_RULES).filter((r) => !r.startsWith('GET ') && !skip.includes(r) && !actionOf(r));
    expect(missing).toEqual([]);
    expect(actionOf('GET sales')).toBeNull();
    expect(AUDITED['PATCH sales/:id/void']).toBeDefined();
  });
});
