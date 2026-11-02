import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { EmptyState } from '@/components/feedback/EmptyState';
import { BarChart3, PieChart } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type Perspective = 'competence' | 'cash' | 'commitment';

export const AnalyticsPage: React.FC = () => {
  const [perspective, setPerspective] = useState<Perspective>('competence');

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Análises & Relatórios"
        subtitle="Acompanhe o consumo e resultados da família"
      />

      {/* Seletor de Perspectiva (Competência vs Caixa vs Comprometimento) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Visão Contábil
        </label>
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-card bg-background-card border border-border text-xs font-medium">
          <button
            type="button"
            onClick={() => setPerspective('competence')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'competence'
                ? 'bg-background-elevated text-brand-primary font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Competência
          </button>
          <button
            type="button"
            onClick={() => setPerspective('cash')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'cash'
                ? 'bg-background-elevated text-brand-primary font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Caixa
          </button>
          <button
            type="button"
            onClick={() => setPerspective('commitment')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'commitment'
                ? 'bg-background-elevated text-brand-primary font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Compromissos
          </button>
        </div>
      </div>

      {/* Resumo do Período */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Resultado do Período"
          value={<MoneyDisplay cents={274940} type="income" size="lg" />}
          subtext={
            perspective === 'competence'
              ? 'Receitas reconhecidas - Despesas'
              : perspective === 'cash'
              ? 'Entradas reais - Saídas de caixa'
              : 'Obrigações futuras projetadas'
          }
        />
        <MetricCard
          label="Economia do Mês"
          value="44,3%"
          subtext="Proporção da receita poupada"
          comparisonType="positive"
        />
      </div>

      {/* Categorias */}
      <div className="flex flex-col gap-3 mt-2">
        <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
          <PieChart className="w-4 h-4 text-brand-primary" />
          Despesas por Categoria
        </h2>

        <EmptyState
          icon={<BarChart3 className="w-7 h-7" />}
          title="Sem dados suficientes no período"
          description="À medida que os lançamentos forem registrados pela família, os gráficos de evolução e categorias serão montados aqui."
        />
      </div>
    </div>
  );
};
