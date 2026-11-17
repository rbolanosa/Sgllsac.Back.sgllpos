import { periodRange, limaDay } from './dashboard.service';

describe('DashboardService.periodRange', () => {
  // 16/11/2026 21:30 en Lima = 17/11/2026 02:30 UTC
  const now = new Date('2026-11-17T02:30:00Z');

  it('usa el día de Lima, no el del servidor (UTC)', () => {
    expect(limaDay(now)).toBe('2026-11-16');
    expect(periodRange('today', now)).toMatchObject({ start: '2026-11-16', end: '2026-11-16', prevStart: '2026-11-15', prevEnd: '2026-11-15', days: 1 });
  });

  it('7 días incluye hoy y compara con los 7 anteriores', () => {
    expect(periodRange('7d', now)).toMatchObject({ start: '2026-11-10', end: '2026-11-16', prevStart: '2026-11-03', prevEnd: '2026-11-09', days: 7 });
  });

  it('30 días', () => {
    expect(periodRange('30d', now)).toMatchObject({ start: '2026-10-18', prevStart: '2026-09-18', prevEnd: '2026-10-17', days: 30 });
  });

  it('el mes compara con los mismos días del mes anterior', () => {
    expect(periodRange('month', now)).toMatchObject({ start: '2026-11-01', prevStart: '2026-10-01', prevEnd: '2026-10-16', days: 16 });
    expect(periodRange('month', new Date('2026-03-31T15:00:00Z'))).toMatchObject({ prevStart: '2026-02-01', prevEnd: '2026-02-28' });
    expect(periodRange('month', new Date('2027-01-05T15:00:00Z'))).toMatchObject({ prevStart: '2026-12-01', prevEnd: '2026-12-05' });
  });
});
