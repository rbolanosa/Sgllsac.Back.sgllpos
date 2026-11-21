import { BadRequestException } from '@nestjs/common';

export interface CreditInstallmentInput { amount: number; dueDate: string }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Revisa las cuotas de una venta al crédito antes de guardarla.
 * SUNAT exige que las cuotas sumen el total y que vencan después de la emisión.
 */
export function validateCreditPlan(
  installments: CreditInstallmentInput[] | undefined,
  total: number,
  issueDate: string,
): { amount: number; dueDate: string }[] {
  if (!installments?.length) throw new BadRequestException('Indica al menos una cuota');
  if (installments.length > 36) throw new BadRequestException('Máximo 36 cuotas');
  const maxDate = new Date(`${issueDate}T12:00:00Z`);
  maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 3);
  const limit = maxDate.toISOString().slice(0, 10);

  const plan = installments
    .map((i) => ({ amount: round2(Number(i.amount)), dueDate: String(i.dueDate).slice(0, 10) }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  plan.forEach((c, idx) => {
    if (!(c.amount > 0)) throw new BadRequestException(`La cuota ${idx + 1} debe ser mayor a cero`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.dueDate)) throw new BadRequestException(`Fecha inválida en la cuota ${idx + 1}`);
    if (c.dueDate <= issueDate) throw new BadRequestException(`La cuota ${idx + 1} debe vencer después de hoy`);
    if (c.dueDate > limit) throw new BadRequestException(`La cuota ${idx + 1} vence demasiado lejos`);
  });

  const sum = round2(plan.reduce((s, c) => s + c.amount, 0));
  // SUNAT exige que sumen exacto: la última cuota absorbe el redondeo en la pantalla
  if (Math.abs(sum - round2(total)) > 0.005) {
    throw new BadRequestException(`Las cuotas suman S/ ${sum.toFixed(2)} y el total es S/ ${round2(total).toFixed(2)}`);
  }
  return plan;
}
