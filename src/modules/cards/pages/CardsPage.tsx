import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CreditCard as CardIcon, Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { calculateCardLimits } from '@/domain/finance/cardLimitCalculator';
import { payInvoice } from '@/application/use-cases/payInvoice';
import { MoneyCents, formatBRL } from '@/domain/money/money';
import { LocalCard } from '@/infrastructure/local/types';
import { cn } from '@/shared/utils/cn';
import { softDeleteFinancialEntity } from '@/application/use-cases/softDeleteFinancialEntity';

export const CardsPage: React.FC = () => {
  const { currentFamily, user } = useAuth();
  const familyId = currentFamily?.id || '';

  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false);
  const [selectedCardForPayment, setSelectedCardForPayment] = useState<LocalCard | null>(null);

  // Formulário de novo cartão
  const [cardName, setCardName] = useState('');
  const [institution, setInstitution] = useState('');
  const [creditLimit, setCreditLimit] = useState<MoneyCents>(200000); // Padrão R$ 2.000,00
  const [closingDay, setClosingDay] = useState(20);
  const [dueDay, setDueDay] = useState(27);
  const [color, setColor] = useState('#820AD1');
  const [accountId, setAccountId] = useState('');

  // Formulário de pagamento de fatura
  const [payAmount, setPayAmount] = useState<MoneyCents>(0);
  const [payAccountId, setPayAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries reativas ao Dexie
  const cards = useLiveQuery(
    () => db.cards.where('familyId').equals(familyId).filter((c) => !c.deletedAt).toArray(),
    [familyId]
  ) || [];

  const accounts = useLiveQuery(
    () => db.accounts.where('familyId').equals(familyId).filter((a) => !a.deletedAt && a.isActive).toArray(),
    [familyId]
  ) || [];

  const installments = useLiveQuery(
    () => db.installments.where('familyId').equals(familyId).filter((i) => !i.deletedAt).toArray(),
    [familyId]
  ) || [];

  const invoices = useLiveQuery(
    () => db.invoices.where('familyId').equals(familyId).filter((inv) => !inv.deletedAt).toArray(),
    [familyId]
  ) || [];

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || !cardName.trim()) return;

    setIsSubmitting(true);
    try {
      const newCard: LocalCard = {
        id: crypto.randomUUID(),
        familyId: currentFamily.id,
        accountId: accountId || null,
        name: cardName.trim(),
        institution: institution.trim() || null,
        creditLimitCents: creditLimit,
        closingDay,
        dueDay,
        closingDayPolicy: 'include_closing_day',
        color,
        isActive: true,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        version: 1,
        syncStatus: 'pending',
      };

      await db.executeLocalMutation(db.cards, 'cards', newCard, 'insert');

      setIsAddCardOpen(false);
      setCardName('');
      setInstitution('');
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cartão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCard = async (card: LocalCard) => {
    const hasHistory = invoices.some((invoice) => invoice.cardId === card.id);
    const message = hasHistory
      ? `Excluir “${card.name}” da lista? Faturas e compras já registradas serão preservadas no histórico.`
      : `Excluir “${card.name}”?`;

    if (!window.confirm(message)) return;
    try {
      await softDeleteFinancialEntity(db.cards, 'cards', card);
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir o cartão.');
    }
  };

  const handleOpenPayment = (card: LocalCard) => {
    setSelectedCardForPayment(card);
    const cardInvoices = invoices.filter((inv) => inv.cardId === card.id && inv.status !== 'paid');
    const openInvoice = cardInvoices[0];

    if (openInvoice) {
      const cardInst = installments.filter((i) => i.invoiceId === openInvoice.id);
      const total = cardInst.reduce((acc, i) => acc + i.amountCents, 0);
      const remaining = Math.max(0, total - openInvoice.paidAmountCents);
      setPayAmount(remaining);
    } else {
      setPayAmount(0);
    }

    if (accounts.length > 0) {
      setPayAccountId(card.accountId || accounts[0]?.id || '');
    }

    setIsPayInvoiceOpen(true);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || !selectedCardForPayment || payAmount <= 0 || !payAccountId) return;

    const cardInvoices = invoices.filter((inv) => inv.cardId === selectedCardForPayment.id && inv.status !== 'paid');
    const invoiceToPay = cardInvoices[0];

    if (!invoiceToPay) {
      alert('Não há fatura aberta pendente para este cartão.');
      return;
    }

    setIsSubmitting(true);
    try {
      await payInvoice({
        familyId: currentFamily.id,
        userId: user.id,
        invoiceId: invoiceToPay.id,
        accountId: payAccountId,
        amountCents: payAmount,
        paidAt: new Date().toISOString(),
      });

      setIsPayInvoiceOpen(false);
      setSelectedCardForPayment(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cartões de Crédito"
        subtitle="Gerencie limites, faturas e parcelas"
        rightAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddCardOpen(true)}
          >
            Novo Cartão
          </Button>
        }
      />

      {cards.length === 0 ? (
        <EmptyState
          icon={<CardIcon className="w-8 h-8" />}
          title="Nenhum cartão cadastrado"
          description="Cadastre seus cartões para calcular automaticamente faturas, datas de fechamento e limites disponíveis em tempo real."
          actionLabel="Adicionar Cartão"
          onAction={() => setIsAddCardOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const cardInst = installments.filter((i) => {
              const inv = invoices.find((v) => v.id === i.invoiceId);
              return inv?.cardId === card.id;
            });
            const cardInvs = invoices.filter((v) => v.cardId === card.id);
            const limits = calculateCardLimits(card.creditLimitCents, cardInst, cardInvs);

            // Fatura atual em aberto
            const currentInvoice = cardInvs.find((v) => v.status === 'open' || v.status === 'closed' || v.status === 'partially_paid');
            const invoiceInst = currentInvoice ? installments.filter((i) => i.invoiceId === currentInvoice.id) : [];
            const invoiceTotal = invoiceInst.reduce((acc, i) => acc + i.amountCents, 0);
            const invoiceRemaining = currentInvoice ? Math.max(0, invoiceTotal - currentInvoice.paidAmountCents) : 0;

            return (
              <div
                key={card.id}
                className="p-5 rounded-card bg-background-card border border-border shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                      style={{ backgroundColor: card.color || '#4D8DDB' }}
                    >
                      <CardIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-text-primary">
                        {card.name}
                      </h3>
                      <span className="text-xs text-text-secondary">
                        {card.institution || 'Cartão Familiar'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-background-elevated border border-border font-medium text-text-secondary flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card)}
                      title="Excluir cartão"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-financial-expense/10 hover:text-financial-expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Barra de Limite */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Limite Comprometido</span>
                    <span className="font-semibold text-text-primary">
                      {formatBRL(limits.committedLimitCents)} de {formatBRL(limits.creditLimitCents)}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-background-elevated overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all duration-300',
                        limits.usagePercentage > 85
                          ? 'bg-financial-expense'
                          : limits.usagePercentage > 65
                          ? 'bg-financial-warning'
                          : 'bg-brand-primary'
                      )}
                      style={{ width: `${limits.usagePercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-secondary pt-0.5">
                    <span>Disponível estimado:</span>
                    <span className="text-financial-income font-bold">
                      {formatBRL(limits.availableLimitCents)}
                    </span>
                  </div>
                </div>

                {/* Destaque da Fatura Atual */}
                <div className="p-3 rounded-xl bg-background-elevated border border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-text-secondary">
                      Fatura Atual ({currentInvoice ? currentInvoice.status === 'closed' ? 'Fechada' : 'Aberta' : 'Sem faturas'})
                    </span>
                    <MoneyDisplay cents={invoiceRemaining} size="md" className="font-bold text-text-primary" />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={invoiceRemaining <= 0}
                    onClick={() => handleOpenPayment(card)}
                  >
                    Pagar Fatura
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo Cartão */}
      {isAddCardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateCard}
            className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
          >
            <h3 className="text-lg font-bold text-text-primary">
              Cadastrar Cartão de Crédito
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Nome do Cartão</label>
              <input
                type="text"
                required
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ex.: Nubank Lucas, XP Black..."
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Instituição / Banco (Opcional)</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex.: Nubank, Itaú..."
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <CurrencyInput
              label="Limite Total de Crédito"
              value={creditLimit}
              onChange={setCreditLimit}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Dia Fechamento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={closingDay}
                  onChange={(e) => setClosingDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Dia Vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  required
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Conta de Pagamento Padrão</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecione...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Cor do Cartão</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <span className="text-xs text-text-secondary">Escolha a cor para identificar o cartão</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddCardOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Salvar Cartão
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Pagar Fatura */}
      {isPayInvoiceOpen && selectedCardForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleConfirmPayment}
            className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
          >
            <h3 className="text-lg font-bold text-text-primary">
              Pagar Fatura • {selectedCardForPayment.name}
            </h3>

            <CurrencyInput
              label="Valor a Pagar"
              value={payAmount}
              onChange={setPayAmount}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Conta de Saída do Dinheiro</label>
              <select
                required
                value={payAccountId}
                onChange={(e) => setPayAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecione a conta...</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-background-elevated border border-border text-xs text-text-secondary">
              <span className="font-semibold text-text-primary">Integridade Contábil:</span> O pagamento debita o saldo da conta selecionada e reduz a dívida do cartão, sem duplicar lançamentos de consumo.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsPayInvoiceOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={payAmount <= 0 || !payAccountId}>
                Confirmar Pagamento
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
