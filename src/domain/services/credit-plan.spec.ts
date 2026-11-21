import { BadRequestException } from '@nestjs/common';
import { validateCreditPlan } from './credit-plan';

describe('validateCreditPlan', () => {
  const today = '2026-11-21';

  it('acepta cuotas que suman el total y las ordena por fecha', () => {
    const plan = validateCreditPlan([{ amount: 590, dueDate: '2027-01-20' }, { amount: 590, dueDate: '2026-12-21' }], 1180, today);
    expect(plan.map((c) => c.dueDate)).toEqual(['2026-12-21', '2027-01-20']);
  });

  it('rechaza cuotas que no suman el total', () => {
    expect(() => validateCreditPlan([{ amount: 500, dueDate: '2026-12-21' }], 1180, today)).toThrow(/suman/);
  });

  it('rechaza una cuota que vence hoy o antes', () => {
    expect(() => validateCreditPlan([{ amount: 100, dueDate: today }], 100, today)).toThrow(BadRequestException);
  });

  it('exige que sumen exacto (SUNAT rechaza 99.99 de 100)', () => {
    const third = (n: number) => ({ amount: n, dueDate: `2027-0${n === 33.34 ? 3 : 1}-21` });
    expect(() => validateCreditPlan([third(33.33), { amount: 33.33, dueDate: '2027-02-21' }, third(33.33)], 100, today)).toThrow(/suman/);
    expect(() => validateCreditPlan([third(33.33), { amount: 33.33, dueDate: '2027-02-21' }, third(33.34)], 100, today)).not.toThrow();
  });
});
