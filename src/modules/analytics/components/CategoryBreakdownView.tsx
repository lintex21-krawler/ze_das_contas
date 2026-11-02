import React from 'react';
import { CategoryBreakdownItem } from '@/domain/analytics/categoryAnalytics';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PieChart, Tag } from 'lucide-react';

interface CategoryBreakdownViewProps {
  items: CategoryBreakdownItem[];
}

export const CategoryBreakdownView: React.FC<CategoryBreakdownViewProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<PieChart className="w-7 h-7" />}
        title="Sem despesas neste período"
        description="Nenhum gasto registrado para o mês selecionado. Registre lançamentos para visualizar a distribuição."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5 rounded-card bg-background-card border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <PieChart className="w-4 h-4 text-brand-primary" />
          Distribuição por Categoria
        </h3>
        <span className="text-xs text-text-secondary">{items.length} categorias</span>
      </div>

      {/* Barra de Distribuição Proporcional Acessível */}
      <div
        className="w-full h-3.5 rounded-full overflow-hidden flex bg-background-elevated"
        role="progressbar"
        aria-label="Distribuição percentual de despesas"
      >
        {items.map((item) => (
          <div
            key={item.categoryId}
            style={{
              width: `${Math.max(2, item.percentage)}%`,
              backgroundColor: item.color,
            }}
            title={`${item.categoryName}: ${item.percentage}%`}
            className="h-full transition-all duration-300 hover:opacity-85"
          />
        ))}
      </div>

      {/* Lista / Tabela Acessível de Categorias */}
      <div className="flex flex-col divide-y divide-border pt-1">
        {items.map((item) => (
          <div
            key={item.categoryId}
            className="py-3 flex items-center justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 text-xs shadow-sm"
                style={{ backgroundColor: item.color }}
              >
                <Tag className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-text-primary truncate">
                  {item.categoryName}
                </span>
                <span className="text-[11px] text-text-secondary">
                  {item.percentage}% das despesas
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <MoneyDisplay cents={item.totalCents} type="expense" size="sm" />
              {item.essentiality !== 'unset' && (
                <span className="text-[10px] text-text-secondary font-medium">
                  {item.essentiality === 'essential' ? 'Essencial' : 'Não Essencial'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
