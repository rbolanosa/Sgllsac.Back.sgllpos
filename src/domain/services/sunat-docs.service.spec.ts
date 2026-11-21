import { daysSince, VOID_MAX_DAYS } from './sunat-docs.service';

describe('comunicación de baja', () => {
  it('cuenta días calendario entre emisión y hoy', () => {
    expect(daysSince('2026-11-14', '2026-11-21')).toBe(7);
    expect(daysSince('2026-11-21', '2026-11-21')).toBe(0);
  });
  it('el plazo de SUNAT es 7 días', () => {
    expect(VOID_MAX_DAYS).toBe(7);
  });
});
