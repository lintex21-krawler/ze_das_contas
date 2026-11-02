import { MoneyCents, addMoney, subtractMoney } from '../money/money';
import {
  LocalTransaction,
  LocalInstallment,
  LocalAccountMovement,
  LocalInvoice,
} from '@/infrastructure/local/types';

export type FinancialPerspective = 'competence' | 'cash' | 'commitment';

export interface MonthReportResult {
  perspective: FinancialPerspective;
  referenceMonth: string; // 'YYYY-MM-01'
  totalIncomeCents: MoneyCents;
  totalExpenseCents: MoneyCents;
  netResultCents: MoneyCents;
  savingsRatePercentage: number;
}

/**
 * Calcula os indicadores mensais sob as 3 perspectivas financeiras:
 * 1. Competência: momento do consumo (crédito no mês da fatura; débito/dinheiro no mês da compra).
 * 2. Caixa: entradas e saídas efetivas que movimentaram as contas bancárias no mês.
 * 3. Comprometimento: obrigações e compromissos ainda não liquidados.
 */
export function calculateMonthReport(
  referenceMonth: string, // 'YYYY-MM-01'
  perspective: FinancialPerspective,
  transactions: LocalTransaction[],
  installments: LocalInstallment[],
  accountMovements: LocalAccountMovement[],
  invoices: LocalInvoice[]
): MonthReportResult {
  const monthPrefix = referenceMonth.slice(0, 7); // 'YYYY-MM'

  let totalIncomeCents = 0;
  let totalExpenseCents = 0;

  if (perspective === 'competence') {
    // 1. Receitas reconhecidas no mês
    for (const tx of transactions) {
      if (tx.deletedAt || tx.transactionType !== 'income') continue;

      const txMonth = tx.competenceMonth || tx.transactionDate.slice(0, 7) + '-01';
      if (txMonth === referenceMonth) {
        totalIncomeCents = addMoney(totalIncomeCents, tx.amountCents);
      }
    }

    // 2. Despesas de consumo:
    // a) Despesas em dinheiro, PIX ou débito (na data da compra)
    for (const tx of transactions) {
      if (tx.deletedAt || tx.transactionType !== 'expense' || tx.paymentMethod === 'credit') continue;

      const txMonth = tx.transactionDate.slice(0, 7) + '-01';
      if (txMonth === referenceMonth) {
        totalExpenseCents = addMoney(totalExpenseCents, tx.amountCents);
      }
    }

    // b) Compras no crédito: parcelas atribuídas à competência da fatura deste mês
    for (const inst of installments) {
      if (inst.deletedAt || inst.status === 'cancelled') continue;

      if (inst.competenceMonth === referenceMonth) {
        totalExpenseCents = addMoney(totalExpenseCents, inst.amountCents);
      }
    }
  } else if (perspective === 'cash') {
    // Visão de Caixa: movimentações que efetivamente debitaram ou creditaram as contas
    for (const mov of accountMovements) {
      if (mov.deletedAt || !mov.effectiveDate.startsWith(monthPrefix)) continue;

      if (mov.movementType === 'income') {
        totalIncomeCents = addMoney(totalIncomeCents, mov.amountCents);
      } else if (mov.movementType === 'expense' || mov.movementType === 'invoice_payment') {
        // Pagamento de fatura sai do caixa aqui!
        totalExpenseCents = addMoney(totalExpenseCents, mov.amountCents);
      }
    }
  } else if (perspective === 'commitment') {
    // Visão de Comprometimento: obrigações vincendas e faturas abertas do mês
    for (const inv of invoices) {
      if (inv.deletedAt || inv.status === 'paid' || inv.status === 'cancelled') continue;

      if (inv.referenceMonth === referenceMonth) {
        // Faturas abertas ou parcialmente pagas
        const invInst = installments.filter((i) => i.invoiceId === inv.id && !i.deletedAt);
        const invTotal = invInst.reduce((acc, i) => acc + i.amountCents, 0);
        const remaining = Math.max(0, invTotal - inv.paidAmountCents);
        totalExpenseCents = addMoney(totalExpenseCents, remaining);
      }
    }

    // Receitas previstas ainda não recebidas
    for (const tx of transactions) {
      if (tx.deletedAt || tx.transactionType !== 'income' || tx.status !== 'planned') continue;
      if (tx.transactionDate.startsWith(monthPrefix)) {
        totalIncomeCents = addMoney(totalIncomeCents, tx.amountCents);
      }
    }
  }

  const netResultCents = subtractMoney(totalIncomeCents, totalExpenseCents);
  const savingsRatePercentage =
    totalIncomeCents > 0
      ? Math.max(0, Math.round((netResultCents / totalIncomeCents) * 100))
      : 0;

  return {
    perspective,
    referenceMonth,
    totalIncomeCents,
    totalExpenseCents,
    netResultCents,
    savingsRatePercentage,
  };
}
