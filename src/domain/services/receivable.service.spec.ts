import { allocatePayment } from './receivable.service';

describe('allocatePayment', () => {
  it('paga primero la cuota más antigua', () => {
    expect(allocatePayment([{ amount: 100, paidAmount: 0 }, { amount: 100, paidAmount: 0 }], 150)).toEqual([100, 50]);
  });
  it('respeta lo ya abonado', () => {
    expect(allocatePayment([{ amount: 100, paidAmount: 60 }, { amount: 100, paidAmount: 0 }], 50)).toEqual([40, 10]);
  });
  it('no aplica más de lo que falta', () => {
    expect(allocatePayment([{ amount: 33.33, paidAmount: 0 }], 33.33)).toEqual([33.33]);
  });
});
