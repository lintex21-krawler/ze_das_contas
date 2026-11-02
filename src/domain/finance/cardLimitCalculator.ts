import { MoneyCents, addMoney, subtractMoney } from '../money/money';
import { LocalInstallment, LocalInvoice } from '@/infrastructure/local/types';

export interface CardLimitResult {
  creditLimitCents: MoneyCents;
  committedLimitCents: MoneyCents;
  availableLimitCents: MoneyCents;
  usagePercentage: number;
}

/**
 * Calcula o limite comprometido e disponível estimado do cartão de crédito.
 * Comprometido = soma das parcelas associadas a faturas abertas, fechadas ou parcialmente pagas.
 */
export function calculateCardLimits(
  creditLimitCents: MoneyCents,
  installments: LocalInstallment[],
  invoices: LocalInvoice[]
): CardLimitResult {
  const unpaidInvoices = new Set(
    invoices
      .filter((inv) => !inv.deletedAt && inv.status !== 'paid' && inv.status !== 'cancelled')
      .map((inv) => inv.id)
  );

  let committedLimitCents = 0;

  for (const inst of installments) {
    if (inst.deletedAt || inst.status === 'cancelled') continue;

    if (unpaidInvoices.has(inst.invoiceId)) {
      committedLimitCents = addMoney(committedLimitCents, inst.amountCents);
    }
  }

  // Desconta os pagamentos parciais já realizados nas faturas em aberto
  for (const inv of invoices) {
    if (unpaidInvoices.has(inv.id) && inv.paidAmountCents > 0) {
      committedLimitCents = Math.max(0, subtractMoney(committedLimitCents, inv.paidAmountCents));
    }
  }

  const availableLimitCents = Math.max(0, subtractMoney(creditLimitCents, committedLimitCents));
  const usagePercentage =
    creditLimitCents > 0
      ? Math.min(100, Math.round((committedLimitCents / creditLimitCents) * 100))
      : 0;

  return {
    creditLimitCents,
    committedLimitCents,
    availableLimitCents,
    usagePercentage,
  };
}
