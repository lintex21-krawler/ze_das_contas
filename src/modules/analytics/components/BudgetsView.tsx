import React, { useState } from 'react';
import { LocalBudget, LocalCategory } from '@/infrastructure/local/types';
import { evaluateBudget } from '@/domain/analytics/budgetAnalytics';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { CreateBudgetModal } from './CreateBudgetModal';
import { Target, Plus, AlertTriangle, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { db } from '@/infrastructure/local/db';
import { CategoryBreakdownItem } from '@/domain/analytics/categoryAnalytics';
import { MoneyCents } from '@/domain/money/money';

interface BudgetsViewProps {
  budgets: LocalBudget[];
  categories: LocalCategory[];
  categoryBreakdown: CategoryBreakdownItem[];
  totalExpensesCents: MoneyCents;
  familyId: string;
  referenceMonth: string;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  categories,
  categoryBreakdown,
  totalExpensesCents,
  familyId,
  referenceMonth,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Deseja remover este orçamento?')) return;
    const now = new Date().toISOString();
    await db.budgets.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-card bg-background-card border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-secondary" />
          Orçamentos e Metas de Gastos
        </h3>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setIsModalOpen(true)}
          className="text-xs"
        >
          Novo Teto
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="p-4 rounded-xl bg-background-elevated border border-border text-center flex flex-col items-center gap-2">
          <p className="text-xs text-text-secondary">
            Nenhum teto de gastos definido para este mês. Estabeleça limites para categorias como Delivery, Mercado ou Lazer e acompanhe seu ritmo.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="text-xs text-brand-primary">
            Definir primeiro teto
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {budgets.map((b) => {
            const cat = categories.find((c) => c.id === b.categoryId);
            const catName = cat ? cat.name : 'Orçamento Geral';

            // Gasto real associado
            let spentCents = 0;
            if (b.categoryId) {
              const item = categoryBreakdown.find((cb) => cb.categoryId === b.categoryId);
              spentCents = item ? item.totalCents : 0;
            } else {
              spentCents = totalExpensesCents;
            }

            const evalResult = evaluateBudget(b, spentCents, catName);

            const StatusIcon =
              evalResult.status === 'exceeded'
                ? AlertCircle
                : evalResult.status === 'alert'
                ? AlertTriangle
                : CheckCircle2;

            return (
              <div
                key={b.id}
                className="p-4 rounded-xl bg-background-elevated border border-border flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-text-primary">{catName}</span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1',
                        evalResult.status === 'exceeded'
                          ? 'bg-financial-expense/15 text-financial-expense'
                          : evalResult.status === 'alert'
                          ? 'bg-financial-warning/15 text-financial-warning'
                          : evalResult.status === 'warning'
                          ? 'bg-brand-secondary/15 text-brand-secondary'
                          : 'bg-financial-income/15 text-financial-income'
                      )}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {evalResult.percentage}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBudget(b.id)}
                    className="text-text-secondary hover:text-financial-expense p-1 transition-colors"
                    title="Excluir teto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full h-2 rounded-full bg-background-card overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      evalResult.status === 'exceeded'
                        ? 'bg-financial-expense'
                        : evalResult.status === 'alert'
                        ? 'bg-financial-warning'
                        : evalResult.status === 'warning'
                        ? 'bg-brand-secondary'
                        : 'bg-financial-income'
                    )}
                    style={{ width: `${Math.min(100, evalResult.percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <span>
                    Gasto: <MoneyDisplay cents={evalResult.spentCents} size="sm" type="expense" />
                  </span>
                  <span>
                    Limite: <MoneyDisplay cents={b.limitCents} size="sm" />
                  </span>
                </div>

                <span className="text-[11px] text-text-secondary italic">
                  {evalResult.feedbackMessage}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <CreateBudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        familyId={familyId}
        referenceMonth={referenceMonth}
        categories={categories}
      />
    </div>
  );
};
