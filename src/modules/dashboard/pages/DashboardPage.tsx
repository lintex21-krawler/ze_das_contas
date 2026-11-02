import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, currentFamily } = useAuth();

  // Valores de exemplo inicial para validação visual (serão substituídos pelo hook do Dexie/Supabase nas fases seguintes)
  const saldoConsolidado = 485020; // R$ 4.850,20
  const receitasMes = 620000; // R$ 6.200,00
  const despesasMes = 345080; // R$ 3.450,80
  const saldoLivreEstimado = 139940; // R$ 1.399,40

  const greeting = profile ? `Olá, ${profile.display_name}!` : 'Olá, Família!';
  const subtitle = currentFamily
    ? `${currentFamily.name} • Novembro de 2026`
    : 'Novembro de 2026 • Visão Geral';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={greeting}
        subtitle={subtitle}
        rightAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/lancar')}
            className="hidden sm:inline-flex"
          >
            Lançar
          </Button>
        }
      />

      {/* Card Destaque: Saldo Consolidado (Caixa Real) */}
      <div className="p-5 sm:p-6 rounded-card bg-background-card border border-border shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-medium text-text-secondary">
            Saldo Consolidado nas Contas
          </span>
          <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <MoneyDisplay cents={saldoConsolidado} size="display" />

        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <span>Saldo livre estimado (após obrigações):</span>
          <MoneyDisplay cents={saldoLivreEstimado} size="sm" type="income" />
        </div>
      </div>

      {/* Grid de Métricas do Mês */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          label="Receitas do Mês"
          value={<MoneyDisplay cents={receitasMes} type="income" size="lg" />}
          icon={<ArrowUpRight className="w-5 h-5 text-financial-income" />}
          comparison="+12% vs. mês ant."
          comparisonType="positive"
        />
        <MetricCard
          label="Despesas do Mês"
          value={<MoneyDisplay cents={despesasMes} type="expense" size="lg" />}
          icon={<ArrowDownRight className="w-5 h-5 text-financial-expense" />}
          comparison="-5% vs. mês ant."
          comparisonType="positive"
        />
      </div>

      {/* Seção de Lançamentos Recentes */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">
            Últimas Movimentações
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/analises')}
            className="text-xs text-brand-primary"
          >
            Ver todas
          </Button>
        </div>

        {/* Empty state inicial */}
        <EmptyState
          icon={<Receipt className="w-7 h-7" />}
          title="Nenhum lançamento recente"
          description="Registre suas receitas e despesas com um toque. Funciona perfeitamente mesmo sem internet."
          actionLabel="Novo Lançamento"
          onAction={() => navigate('/lancar')}
        />
      </div>
    </div>
  );
};
