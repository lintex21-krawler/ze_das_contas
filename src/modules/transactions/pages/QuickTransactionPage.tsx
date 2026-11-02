import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { MoneyCents, formatBRL, splitAmountIntoInstallments } from '@/domain/money/money';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { createExpense } from '@/application/use-cases/createExpense';
import { createIncome } from '@/application/use-cases/createIncome';
import { createTransfer } from '@/application/use-cases/createTransfer';
import { cn } from '@/shared/utils/cn';
import { useNavigate } from 'react-router-dom';

type TransactionType = 'expense' | 'income' | 'transfer' | 'natural_language';

export const QuickTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentFamily, user } = useAuth();

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<MoneyCents>(0);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'debit' | 'credit' | 'cash'>('pix');
  const [accountId, setAccountId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(1);
  const [naturalText, setNaturalText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Consulta reativa ao banco local Dexie
  const familyId = currentFamily?.id || '';
  const accounts = useLiveQuery(
    () => db.accounts.where('familyId').equals(familyId).filter((a) => !a.deletedAt && a.isActive).toArray(),
    [familyId]
  ) || [];

  const cards = useLiveQuery(
    () => db.cards.where('familyId').equals(familyId).filter((c) => !c.deletedAt && c.isActive).toArray(),
    [familyId]
  ) || [];

  const categories = useLiveQuery(
    () =>
      db.categories
        .where('familyId')
        .equals(familyId)
        .filter((cat) => !cat.deletedAt && cat.isActive)
        .toArray(),
    [familyId]
  ) || [];

  // Categorias compatíveis com o tipo de lançamento atual.
  const applicableCategories = categories.filter((category) =>
    txType === 'expense'
      ? category.transactionType === 'expense' || category.transactionType === 'both'
      : txType === 'income'
      ? category.transactionType === 'income' || category.transactionType === 'both'
      : false
  );

  // Define seleção padrão quando os dados carregarem
  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0]?.id || '');
    }
    if (!destinationAccountId && accounts.length > 1) {
      setDestinationAccountId(accounts[1]?.id || '');
    }
    if (!cardId && cards.length > 0) {
      setCardId(cards[0]?.id || '');
    }
    if (!categoryId && applicableCategories.length > 0) {
      setCategoryId(applicableCategories[0]?.id || '');
    }
  }, [accounts, cards, applicableCategories, accountId, destinationAccountId, cardId, categoryId]);

  const typeButtons = [
    { type: 'expense' as const, label: 'Despesa', icon: ArrowDownRight, color: 'text-financial-expense' },
    { type: 'income' as const, label: 'Receita', icon: ArrowUpRight, color: 'text-financial-income' },
    { type: 'transfer' as const, label: 'Transferir', icon: ArrowLeftRight, color: 'text-brand-primary' },
    { type: 'natural_language' as const, label: 'Texto / IA', icon: Sparkles, color: 'text-brand-secondary' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || amount <= 0 || !description.trim()) return;

    setIsSubmitting(true);
    try {
      if (txType === 'expense') {
        await createExpense({
          familyId: currentFamily.id,
          userId: user.id,
          description: description.trim(),
          amountCents: amount,
          transactionDate,
          categoryId: categoryId || null,
          paymentMethod,
          accountId: paymentMethod === 'credit' ? null : accountId,
          cardId: paymentMethod === 'credit' ? cardId : null,
          installmentCount: paymentMethod === 'credit' ? installmentCount : 1,
        });
      } else if (txType === 'income') {
        await createIncome({
          familyId: currentFamily.id,
          userId: user.id,
          description: description.trim(),
          amountCents: amount,
          transactionDate,
          categoryId: categoryId || null,
          accountId,
          status: 'settled',
        });
      } else if (txType === 'transfer') {
        await createTransfer({
          familyId: currentFamily.id,
          userId: user.id,
          originAccountId: accountId,
          destinationAccountId,
          amountCents: amount,
          transferDate: transactionDate,
          description: description.trim(),
        });
      }

      setSuccessMessage('Lançamento salvo localmente e pronto para sincronizar!');
      setTimeout(() => {
        navigate('/');
      }, 700);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar lançamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Previsão de parcelas
  const installmentOptions = [1, 2, 3, 4, 5, 6, 8, 10, 12, 18, 24];
  const installmentSplits =
    amount > 0 && installmentCount > 1
      ? splitAmountIntoInstallments(amount, installmentCount)
      : [];

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
      <PageHeader title="Novo Lançamento" subtitle="Registre com agilidade" />

      {/* Seletor de Tipo de Transação */}
      <div className="grid grid-cols-4 gap-2 p-1.5 rounded-card bg-background-card border border-border">
        {typeButtons.map((btn) => {
          const Icon = btn.icon;
          const isSelected = txType === btn.type;
          return (
            <button
              key={btn.type}
              type="button"
              onClick={() => {
                setTxType(btn.type);
                setSuccessMessage(null);
              }}
              className={cn(
                'flex flex-col items-center justify-center py-2.5 px-1 rounded-xl text-xs font-semibold transition-all min-h-touch',
                isSelected
                  ? 'bg-background-elevated text-text-primary shadow-sm ring-1 ring-border'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              <Icon className={cn('w-4 h-4 mb-1 shrink-0', btn.color)} />
              <span className="truncate">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {successMessage && (
        <div className="p-4 rounded-card bg-financial-income/15 border border-financial-income/30 text-financial-income text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Modo Linguagem Natural */}
      {txType === 'natural_language' ? (
        <div className="flex flex-col gap-4 p-5 rounded-card bg-background-card border border-border">
          <div className="flex items-center gap-2 text-brand-secondary text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Entrada em Português Claro</span>
          </div>

          <textarea
            rows={3}
            value={naturalText}
            onChange={(e) => setNaturalText(e.target.value)}
            placeholder="Ex.: Gastei R$ 85 no mercado no cartão Nubank em 2 vezes"
            className="w-full p-3 rounded-input bg-background-elevated border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-secondary resize-none"
          />

          <p className="text-xs text-text-secondary">
            O interpretador identificará valor, cartão, parcelas e categoria. Você revisará tudo antes de salvar.
          </p>

          <Button
            variant="primary"
            size="lg"
            disabled={!naturalText.trim()}
            onClick={() => alert('Parser de linguagem natural em desenvolvimento na Fase 6.')}
            className="bg-brand-secondary hover:bg-brand-secondary/90 w-full"
          >
            Interpretar e Revisar
          </Button>
        </div>
      ) : (
        /* Formulário Financeiro Real */
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 rounded-card bg-background-card border border-border">
          <CurrencyInput
            label="Valor"
            value={amount}
            onChange={setAmount}
            placeholder="R$ 0,00"
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs sm:text-sm font-medium text-text-secondary">
              Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                txType === 'expense'
                  ? 'Ex.: Supermercado, Farmácia, Combustível...'
                  : txType === 'income'
                  ? 'Ex.: Salário, Freelance, Rendimentos...'
                  : 'Ex.: Reserva de emergência...'
              }
              className="w-full px-4 py-3 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs sm:text-sm font-medium text-text-secondary">
                Data
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {txType !== 'transfer' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-medium text-text-secondary">
                  Categoria
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Selecione...</option>
                  {applicableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {applicableCategories.length === 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/categorias')}
                    className="mt-1 text-left text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Criar uma categoria agora
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Formas de pagamento para Despesa */}
          {txType === 'expense' && (
            <div className="flex flex-col gap-3 pt-2 border-t border-border">
              <label className="text-xs sm:text-sm font-medium text-text-secondary">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['pix', 'debit', 'credit', 'cash'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'py-2 px-1 rounded-xl text-xs font-semibold border transition-all text-center',
                      paymentMethod === method
                        ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                        : 'bg-background-elevated text-text-secondary border-border hover:text-text-primary'
                    )}
                  >
                    {method === 'pix' ? 'PIX' : method === 'debit' ? 'Débito' : method === 'credit' ? 'Crédito' : 'Dinheiro'}
                  </button>
                ))}
              </div>

              {/* Se Crédito, seleciona Cartão e Parcelas */}
              {paymentMethod === 'credit' ? (
                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-medium text-text-secondary">
                      Cartão de Crédito
                    </label>
                    <select
                      value={cardId}
                      required
                      onChange={(e) => setCardId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      <option value="">Selecione o cartão...</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.institution || 'Cartão'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs sm:text-sm font-medium text-text-secondary">
                      Parcelas
                    </label>
                    <select
                      value={installmentCount}
                      onChange={(e) => setInstallmentCount(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    >
                      {installmentOptions.map((n) => (
                        <option key={n} value={n}>
                          {n}x {amount > 0 ? `(${formatBRL(Math.round(amount / n))} / mês)` : ''}
                        </option>
                      ))}
                    </select>
                    {installmentCount > 1 && installmentSplits.length > 0 && (
                      <span className="text-[11px] text-text-secondary mt-0.5">
                        1ª parcela: {formatBRL(installmentSplits[0] ?? 0)} • Demais: {formatBRL(installmentSplits[1] ?? 0)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Dinheiro / PIX / Débito: seleciona Conta Bancária */
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-xs sm:text-sm font-medium text-text-secondary">
                    Conta de Origem
                  </label>
                  <select
                    value={accountId}
                    required
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="">Selecione a conta...</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Seleção de Conta para Receita */}
          {txType === 'income' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <label className="text-xs sm:text-sm font-medium text-text-secondary">
                Conta de Destino
              </label>
              <select
                value={accountId}
                required
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecione a conta de recebimento...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Seleção de Contas para Transferência */}
          {txType === 'transfer' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-medium text-text-secondary">
                  Conta Origem (Sai)
                </label>
                <select
                  value={accountId}
                  required
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Origem...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-medium text-text-secondary">
                  Conta Destino (Entra)
                </label>
                <select
                  value={destinationAccountId}
                  required
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  <option value="">Destino...</option>
                  {accounts
                    .filter((acc) => acc.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-background-elevated border border-border text-xs text-text-secondary flex items-center justify-between mt-1">
            <span>Disponibilidade offline:</span>
            <span className="text-financial-income font-medium">✓ Gravação local imediata</span>
          </div>

          <Button
            type="submit"
            variant={txType === 'expense' ? 'danger' : 'primary'}
            size="lg"
            isLoading={isSubmitting}
            disabled={amount <= 0 || !description.trim()}
            className="w-full mt-1"
          >
            Salvar {txType === 'expense' ? 'Despesa' : txType === 'income' ? 'Receita' : 'Transferência'}
          </Button>
        </form>
      )}
    </div>
  );
};
