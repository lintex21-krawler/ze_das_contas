import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { MonthSelector } from '../components/MonthSelector';
import { CategoryBreakdownView } from '../components/CategoryBreakdownView';
import { BudgetsView } from '../components/BudgetsView';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { calculateMonthReport, FinancialPerspective } from '@/domain/analytics/perspectivesCalculator';
import { calculateCategoryBreakdown } from '@/domain/analytics/categoryAnalytics';
import { ArrowDownRight, ArrowUpRight, Scale, PiggyBank, Users } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export const AnalyticsPage: React.FC = () => {
  const { currentFamily, user } = useAuth();
  const familyId = currentFamily?.id || '';

  // Estado do mês de competência selecionado ('YYYY-MM-01')
  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.toISOString().slice(0, 7)}-01`;
  });

  // Visão Contábil: Competência, Caixa ou Compromissos
  const [perspective, setPerspective] = useState<FinancialPerspective>('competence');

  // Filtro por membro da família ('all' ou userId)
  const [selectedMember, setSelectedMember] = useState<string>('all');

  // Consultas reativas ao Dexie
  const rawTransactions = useLiveQuery(
    () => db.transactions.where('familyId').equals(familyId).filter((t) => !t.deletedAt).toArray(),
    [familyId]
  ) || [];

  const rawInstallments = useLiveQuery(
    () => db.installments.where('familyId').equals(familyId).filter((i) => !i.deletedAt).toArray(),
    [familyId]
  ) || [];

  const accountMovements = useLiveQuery(
    () => db.accountMovements.where('familyId').equals(familyId).filter((m) => !m.deletedAt).toArray(),
    [familyId]
  ) || [];

  const invoices = useLiveQuery(
    () => db.invoices.where('familyId').equals(familyId).filter((inv) => !inv.deletedAt).toArray(),
    [familyId]
  ) || [];

  const categories = useLiveQuery(
    () => db.categories.where('familyId').equals(familyId).filter((c) => !c.deletedAt).toArray(),
    [familyId]
  ) || [];

  const budgets = useLiveQuery(
    () =>
      db.budgets
        .where('familyId')
        .equals(familyId)
        .filter((b) => !b.deletedAt && b.referenceMonth === currentMonth)
        .toArray(),
    [familyId, currentMonth]
  ) || [];

  // Filtragem por membro da família (se selecionado)
  const transactions =
    selectedMember === 'all'
      ? rawTransactions
      : rawTransactions.filter((t) => t.createdBy === selectedMember);

  const installments = rawInstallments; // Parcelas seguem o plano familiar

  // Cálculos analíticos
  const report = calculateMonthReport(
    currentMonth,
    perspective,
    transactions,
    installments,
    accountMovements,
    invoices
  );

  const categoryBreakdown = calculateCategoryBreakdown(
    currentMonth,
    transactions,
    installments,
    categories
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Análises & Relatórios"
        subtitle="Acompanhe o consumo e resultados da família"
      />

      {/* Navegação de Mês e Filtro de Pessoa */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1">
          <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
        </div>

        {/* Filtro de Membro */}
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-card bg-background-card border border-border shrink-0 text-xs">
          <Users className="w-4 h-4 text-text-secondary" />
          <span className="text-text-secondary font-medium">Membro:</span>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="bg-transparent text-text-primary font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">Toda a Família</option>
            {user && <option value={user.id}>Meus Lançamentos</option>}
            {Array.from(new Set(rawTransactions.map((t) => t.createdBy).filter(Boolean)))
              .filter((id) => id !== user?.id)
              .map((id) => (
                <option key={id} value={id}>
                  Membro ({id.slice(0, 6)})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Seletor de Perspectiva (Competência vs Caixa vs Comprometimento) */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-card bg-background-card border border-border text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPerspective('competence')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'competence'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Competência (Consumo)
          </button>
          <button
            type="button"
            onClick={() => setPerspective('cash')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'cash'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Caixa (Bancos)
          </button>
          <button
            type="button"
            onClick={() => setPerspective('commitment')}
            className={cn(
              'py-2 px-1 rounded-xl text-center transition-all min-h-touch',
              perspective === 'commitment'
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Compromissos
          </button>
        </div>

        {/* Nota Educativa da Perspectiva */}
        <p className="text-xs text-text-secondary px-1">
          {perspective === 'competence' &&
            'ℹ️ Visão de Competência: mostra onde e quando você consumiu. Compras no cartão entram no mês da fatura respectiva.'}
          {perspective === 'cash' &&
            'ℹ️ Visão de Caixa: mostra exatamente quando o dinheiro entrou e saiu da sua conta bancária (incluindo pagamentos de fatura).'}
          {perspective === 'commitment' &&
            'ℹ️ Visão de Compromissos: mostra faturas abertas e obrigações a vencer neste mês.'}
        </p>
      </div>

      {/* Grid com 4 Indicadores Chave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="Receitas"
          value={<MoneyDisplay cents={report.totalIncomeCents} type="income" size="md" />}
          icon={<ArrowUpRight className="w-4 h-4 text-financial-income" />}
        />
        <MetricCard
          label="Despesas / Saídas"
          value={<MoneyDisplay cents={report.totalExpenseCents} type="expense" size="md" />}
          icon={<ArrowDownRight className="w-4 h-4 text-financial-expense" />}
        />
        <MetricCard
          label="Resultado Líquido"
          value={
            <MoneyDisplay
              cents={report.netResultCents}
              type={report.netResultCents >= 0 ? 'income' : 'expense'}
              showPositiveSign
              size="md"
            />
          }
          icon={<Scale className="w-4 h-4 text-brand-primary" />}
        />
        <MetricCard
          label="Taxa de Poupança"
          value={`${report.savingsRatePercentage}%`}
          subtext={report.savingsRatePercentage >= 20 ? 'Excelente ritmo!' : 'Meta sugerida: 20%'}
          icon={<PiggyBank className="w-4 h-4 text-brand-secondary" />}
          comparisonType={report.savingsRatePercentage >= 20 ? 'positive' : 'neutral'}
        />
      </div>

      {/* Despesas por Categoria */}
      <CategoryBreakdownView items={categoryBreakdown} />

      {/* Metas e Tetos de Gastos */}
      <BudgetsView
        budgets={budgets}
        categories={categories}
        categoryBreakdown={categoryBreakdown}
        totalExpensesCents={report.totalExpenseCents}
        familyId={familyId}
        referenceMonth={currentMonth}
      />
    </div>
  );
};
