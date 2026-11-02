import { MoneyCents } from '../money/money';
import { LocalBudget } from '@/infrastructure/local/types';

export type BudgetStatus = 'normal' | 'warning' | 'alert' | 'exceeded';

export interface BudgetEvaluationResult {
  budget: LocalBudget;
  spentCents: MoneyCents;
  remainingCents: MoneyCents;
  percentage: number;
  status: BudgetStatus;
  feedbackMessage: string;
}

/**
 * Avalia o progresso do orçamento e retorna o status e mensagem acolhedora.
 */
export function evaluateBudget(
  budget: LocalBudget,
  spentCents: MoneyCents,
  categoryName?: string
): BudgetEvaluationResult {
  const limit = budget.limitCents;
  const remainingCents = Math.max(0, limit - spentCents);
  const percentage = limit > 0 ? Math.round((spentCents / limit) * 100) : 0;

  const targetName = categoryName || 'Orçamento Geral';

  let status: BudgetStatus = 'normal';
  let feedbackMessage = `Dentro do previsto para ${targetName}`;

  if (percentage >= 100) {
    status = 'exceeded';
    feedbackMessage = `Você atingiu 100% do limite de ${targetName}.`;
  } else if (percentage >= 90) {
    status = 'alert';
    feedbackMessage = `Atenção: você está em ${percentage}% do limite de ${targetName}, bem próximo do limite planejado.`;
  } else if (percentage >= 70) {
    status = 'warning';
    feedbackMessage = `Você utilizou ${percentage}% do orçamento planejado para ${targetName}.`;
  }

  return {
    budget,
    spentCents,
    remainingCents,
    percentage,
    status,
    feedbackMessage,
  };
}
