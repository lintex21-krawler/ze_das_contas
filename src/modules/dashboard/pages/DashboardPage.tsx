import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { calculateConsolidatedBalance } from '@/domain/finance/balanceCalculator';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, currentFamily } = useAuth();
  const familyId = currentFamily?.id || '';

  // Consultas reativas aos dados locais da família
  const accounts = useLiveQuery(
    () => db.accounts.where('familyId').equals(familyId).filter((a) => !a.deletedAt).toArray(),
    [familyId]
  ) || [];

  const movements = useLiveQuery(
    () => db.accountMovements.where('familyId').equals(familyId).filter((m) => !m.deletedAt).toArray(),
    [familyId]
  ) || [];

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('familyId')
        .equals(familyId)
        .filter((t) => !t.deletedAt)
        .reverse()
        .sortBy('transactionDate'),
    [familyId]
  ) || [];

  // Mês atual 'YYYY-MM'
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);

  // Cálculos financeiros reais
  const saldoConsolidado = calculateConsolidatedBalance(accounts, movements);

  const receitasMes = transactions
    .filter((t) => t.transactionType === 'income' && t.status === 'settled' && t.transactionDate.startsWith(currentMonthPrefix))
    .reduce((acc, t) => acc + t.amountCents, 0);

  const despesasMes = transactions
    .filter((t) => t.transactionType === 'expense' && t.status === 'settled' && t.transactionDate.startsWith(currentMonthPrefix))
    .reduce((acc, t) => acc + t.amountCents, 0);

  const saldoLivreEstimado = Math.max(0, saldoConsolidado - despesasMes);

  const greeting = profile ? `Olá, ${profile.display_name}!` : 'Olá, Família!';
  const subtitle = currentFamily
    ? `${currentFamily.name} • Visão Geral`
    : 'Visão Geral Financeira';

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
          <span>Saldo livre estimado:</span>
          <MoneyDisplay cents={saldoLivreEstimado} size="sm" type="income" />
        </div>
      </div>

      {/* Grid de Métricas do Mês */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <MetricCard
          label="Receitas do Mês"
          value={<MoneyDisplay cents={receitasMes} type="income" size="lg" />}
          icon={<ArrowUpRight className="w-5 h-5 text-financial-income" />}
        />
        <MetricCard
          label="Despesas do Mês"
          value={<MoneyDisplay cents={despesasMes} type="expense" size="lg" />}
          icon={<ArrowDownRight className="w-5 h-5 text-financial-expense" />}
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

        {transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-7 h-7" />}
            title="Nenhum lançamento recente"
            description="Registre suas receitas e despesas com um toque. Funciona perfeitamente mesmo sem internet."
            actionLabel="Novo Lançamento"
            onAction={() => navigate('/lancar')}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-card bg-background-card border border-border flex items-center justify-between gap-3 shadow-sm hover:border-brand-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.transactionType === 'income'
                        ? 'bg-financial-income/15 text-financial-income'
                        : 'bg-financial-expense/15 text-financial-expense'
                    }`}
                  >
                    {tx.transactionType === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-text-primary line-clamp-1">
                      {tx.description}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {tx.transactionDate} • {tx.paymentMethod ? tx.paymentMethod.toUpperCase() : 'RECEITA'}
                    </span>
                  </div>
                </div>

                <MoneyDisplay
                  cents={tx.amountCents}
                  type={tx.transactionType === 'income' ? 'income' : 'expense'}
                  size="md"
                  showPositiveSign
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
