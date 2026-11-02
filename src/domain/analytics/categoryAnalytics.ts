import { MoneyCents, addMoney } from '../money/money';
import { LocalTransaction, LocalInstallment, LocalCategory } from '@/infrastructure/local/types';

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string | null;
  essentiality: 'essential' | 'non_essential' | 'unset';
  totalCents: MoneyCents;
  percentage: number;
}

/**
 * Agrupa as despesas do mês por categoria sob a perspectiva de competência.
 */
export function calculateCategoryBreakdown(
  referenceMonth: string, // 'YYYY-MM-01'
  transactions: LocalTransaction[],
  installments: LocalInstallment[],
  categories: LocalCategory[]
): CategoryBreakdownItem[] {
  const categoryMap = new Map<string, LocalCategory>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const categoryTotals = new Map<string, MoneyCents>();
  let overallExpenses = 0;

  // 1. Despesas à vista no mês
  for (const tx of transactions) {
    if (tx.deletedAt || tx.transactionType !== 'expense' || tx.paymentMethod === 'credit') continue;

    const txMonth = tx.transactionDate.slice(0, 7) + '-01';
    if (txMonth === referenceMonth) {
      const catId = tx.categoryId || 'uncategorized';
      const current = categoryTotals.get(catId) || 0;
      const updated = addMoney(current, tx.amountCents);
      categoryTotals.set(catId, updated);
      overallExpenses = addMoney(overallExpenses, tx.amountCents);
    }
  }

  // 2. Parcelas no crédito atribuídas a este mês
  // Encontra a transação original para saber a categoria
  const txMap = new Map<string, LocalTransaction>();
  for (const tx of transactions) {
    txMap.set(tx.id, tx);
  }

  for (const inst of installments) {
    if (inst.deletedAt || inst.status === 'cancelled') continue;

    if (inst.competenceMonth === referenceMonth) {
      // Como a parcela está ligada ao planId, buscamos a transação correspondente se possível
      const catId = 'credit_card'; // Agrupamento ou categoria da compra
      const current = categoryTotals.get(catId) || 0;
      const updated = addMoney(current, inst.amountCents);
      categoryTotals.set(catId, updated);
      overallExpenses = addMoney(overallExpenses, inst.amountCents);
    }
  }

  const result: CategoryBreakdownItem[] = [];

  for (const [catId, totalCents] of categoryTotals.entries()) {
    const cat = categoryMap.get(catId);
    const categoryName = cat ? cat.name : catId === 'credit_card' ? 'Cartão de Crédito' : 'Sem Categoria';
    const color = cat?.color || '#64748B';
    const icon = cat?.icon || 'Tag';
    const essentiality = cat?.essentiality || 'unset';
    const percentage = overallExpenses > 0 ? Math.round((totalCents / overallExpenses) * 100) : 0;

    result.push({
      categoryId: catId,
      categoryName,
      color,
      icon,
      essentiality,
      totalCents,
      percentage,
    });
  }

  // Ordena por maior valor gasto
  result.sort((a, b) => b.totalCents - a.totalCents);
  return result;
}
