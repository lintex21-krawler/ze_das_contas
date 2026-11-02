import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { MonthSelector } from '../components/MonthSelector';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { deleteTransaction } from '@/application/use-cases/deleteTransaction';
import { formatBRL } from '@/domain/money/money';
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Trash2,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { cn } from '@/shared/utils/cn';

type EntryKind = 'income' | 'expense_cash' | 'expense_credit';

interface ExtractEntry {
  id: string; // id da transação OU da parcela
  txId: string; // sempre a transação raiz
  date: string;
  description: string;
  amountCents: number;
  kind: EntryKind;
  paymentMethod: string | null;
  categoryName: string | null;
  installmentNumber?: number;
  installmentCount?: number;
  invoiceDueDate?: string;
}

export const ExtractPage: React.FC = () => {
  const { currentFamily } = useAuth();
  const familyId = currentFamily?.id || '';

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.toISOString().slice(0, 7)}-01`;
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const transactions = useLiveQuery(
    () =>
      db.transactions
        .where('familyId')
        .equals(familyId)
        .filter((t) => !t.deletedAt)
        .toArray(),
    [familyId]
  ) || [];

  const installments = useLiveQuery(
    () =>
      db.installments
        .where('familyId')
        .equals(familyId)
        .filter((i) => !i.deletedAt)
        .toArray(),
    [familyId]
  ) || [];

  const installmentPlans = useLiveQuery(
    () =>
      db.installmentPlans
        .where('familyId')
        .equals(familyId)
        .filter((p) => !p.deletedAt)
        .toArray(),
    [familyId]
  ) || [];

  const categories = useLiveQuery(
    () => db.categories.where('familyId').equals(familyId).filter((c) => !c.deletedAt).toArray(),
    [familyId]
  ) || [];

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const planMap = useMemo(() => {
    const map: Record<string, typeof installmentPlans[0]> = {};
    installmentPlans.forEach((p) => { map[p.id] = p; });
    return map;
  }, [installmentPlans]);

  const txMap = useMemo(() => {
    const map: Record<string, typeof transactions[0]> = {};
    transactions.forEach((t) => { map[t.id] = t; });
    return map;
  }, [transactions]);

  // Monta entradas do extrato para o mês selecionado
  const entries: ExtractEntry[] = useMemo(() => {
    const result: ExtractEntry[] = [];
    const monthPrefix = currentMonth.slice(0, 7);

    // Receitas e despesas à vista no mês
    for (const tx of transactions) {
      if (tx.paymentMethod === 'credit') continue;
      if (!tx.transactionDate.startsWith(monthPrefix)) continue;

      result.push({
        id: tx.id,
        txId: tx.id,
        date: tx.transactionDate,
        description: tx.description,
        amountCents: tx.amountCents,
        kind: tx.transactionType === 'income' ? 'income' : 'expense_cash',
        paymentMethod: tx.paymentMethod,
        categoryName: tx.categoryId ? (categoryMap[tx.categoryId] ?? null) : null,
      });
    }

    // Parcelas de crédito com competência no mês
    for (const inst of installments) {
      if (inst.competenceMonth !== currentMonth) continue;
      const plan = planMap[inst.planId];
      if (!plan) continue;
      const tx = txMap[plan.originalTransactionId];
      if (!tx || tx.deletedAt) continue;

      result.push({
        id: inst.id,
        txId: tx.id,
        date: tx.transactionDate,
        description: tx.description,
        amountCents: inst.amountCents,
        kind: 'expense_credit',
        paymentMethod: 'credit',
        categoryName: tx.categoryId ? (categoryMap[tx.categoryId] ?? null) : null,
        installmentNumber: inst.installmentNumber,
        installmentCount: plan.installmentCount,
        invoiceDueDate: inst.dueDate,
      });
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, installments, installmentPlans, currentMonth, categoryMap, planMap, txMap]);

  const totalIncome = entries.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amountCents, 0);
  const totalExpense = entries.filter((e) => e.kind !== 'income').reduce((s, e) => s + e.amountCents, 0);

  const handleDelete = async (entry: ExtractEntry) => {
    const label = entry.installmentNumber
      ? `a parcela ${entry.installmentNumber}/${entry.installmentCount} de "${entry.description}"`
      : `"${entry.description}"`;

    if (!window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;

    setDeletingId(entry.id);
    try {
      if (entry.kind === 'expense_credit') {
        // Para crédito: exclui toda a transação e parcelas vinculadas
        const tx = txMap[entry.txId];
        if (tx) await deleteTransaction(tx);
      } else {
        const tx = txMap[entry.txId];
        if (tx) await deleteTransaction(tx);
      }
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir.');
    } finally {
      setDeletingId(null);
    }
  };

  const paymentLabel: Record<string, string> = {
    pix: 'PIX', debit: 'Débito', credit: 'Crédito', cash: 'Dinheiro', other: 'Outro',
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Extrato Mensal" subtitle="Todos os registros do mês" />

      <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-card bg-background-card border border-border flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Receitas</span>
          <MoneyDisplay cents={totalIncome} type="income" size="lg" />
        </div>
        <div className="p-4 rounded-card bg-background-card border border-border flex flex-col gap-1">
          <span className="text-xs text-text-secondary">Despesas</span>
          <MoneyDisplay cents={totalExpense} type="expense" size="lg" />
        </div>
      </div>

      {/* Lista */}
      {entries.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="Nenhum lançamento neste mês"
          description="Navegue pelos meses ou registre um novo lançamento."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const isDeleting = deletingId === entry.id;
            const Icon = entry.kind === 'income' ? ArrowUpRight : entry.kind === 'expense_credit' ? CreditCard : ArrowDownRight;
            const colorClass = entry.kind === 'income' ? 'text-financial-income' : 'text-financial-expense';
            const bgClass = entry.kind === 'income' ? 'bg-financial-income/15' : 'bg-financial-expense/15';

            return (
              <div
                key={entry.id}
                className="rounded-card bg-background-card border border-border overflow-hidden"
              >
                {/* Linha principal */}
                <div className="flex items-center gap-3 p-3.5">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bgClass, colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary line-clamp-1">{entry.description}</p>
                    <p className="text-[11px] text-text-secondary">
                      {new Date(`${entry.date}T12:00:00`).toLocaleDateString('pt-BR')}
                      {entry.categoryName && ` • ${entry.categoryName}`}
                      {entry.paymentMethod && ` • ${paymentLabel[entry.paymentMethod] ?? entry.paymentMethod}`}
                      {entry.installmentNumber && ` • ${entry.installmentNumber}/${entry.installmentCount}x`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <MoneyDisplay
                      cents={entry.amountCents}
                      type={entry.kind === 'income' ? 'income' : 'expense'}
                      size="sm"
                      showPositiveSign
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-background-elevated"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Painel de detalhes + exclusão */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-background-elevated flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div>
                        <span className="text-text-secondary block">Tipo</span>
                        <span className="font-semibold">
                          {entry.kind === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary block">Pagamento</span>
                        <span className="font-semibold">{paymentLabel[entry.paymentMethod ?? ''] ?? '—'}</span>
                      </div>
                      {entry.categoryName && (
                        <div>
                          <span className="text-text-secondary block">Categoria</span>
                          <span className="font-semibold">{entry.categoryName}</span>
                        </div>
                      )}
                      {entry.installmentNumber && (
                        <>
                          <div>
                            <span className="text-text-secondary block">Parcela</span>
                            <span className="font-semibold">{entry.installmentNumber}/{entry.installmentCount}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary block">Vencimento fatura</span>
                            <span className="font-semibold">
                              {entry.invoiceDueDate
                                ? new Date(`${entry.invoiceDueDate}T12:00:00`).toLocaleDateString('pt-BR')
                                : '—'}
                            </span>
                          </div>
                        </>
                      )}
                      <div>
                        <span className="text-text-secondary block">Valor total</span>
                        <span className="font-semibold">{formatBRL(entry.amountCents)}</span>
                      </div>
                    </div>

                    {entry.kind === 'expense_credit' && (
                      <p className="text-[11px] text-text-secondary bg-background-card rounded-lg p-2">
                        Ao excluir, todas as parcelas desta compra serão removidas do extrato e dos relatórios.
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(entry)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-financial-expense/10 border border-financial-expense/30 text-financial-expense text-sm font-semibold hover:bg-financial-expense/20 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <span>Excluindo…</span>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Excluir este lançamento
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
