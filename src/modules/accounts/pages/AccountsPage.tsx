import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Wallet, Plus, ArrowLeftRight, Landmark, Trash2 } from 'lucide-react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { calculateAccountBalance } from '@/domain/finance/balanceCalculator';
import { createTransfer } from '@/application/use-cases/createTransfer';
import { MoneyCents } from '@/domain/money/money';
import { LocalAccount } from '@/infrastructure/local/types';
import { softDeleteFinancialEntity } from '@/application/use-cases/softDeleteFinancialEntity';

export const AccountsPage: React.FC = () => {
  const { currentFamily, user } = useAuth();
  const familyId = currentFamily?.id || '';

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Formulário de Nova Conta
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<LocalAccount['accountType']>('checking');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState<MoneyCents>(0);

  // Formulário de Transferência
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [transferAmount, setTransferAmount] = useState<MoneyCents>(0);
  const [transferDesc, setTransferDesc] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries reativas ao Dexie
  const accounts = useLiveQuery(
    () => db.accounts.where('familyId').equals(familyId).filter((a) => !a.deletedAt).toArray(),
    [familyId]
  ) || [];

  const movements = useLiveQuery(
    () => db.accountMovements.where('familyId').equals(familyId).filter((m) => !m.deletedAt).toArray(),
    [familyId]
  ) || [];

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || !accountName.trim()) return;

    setIsSubmitting(true);
    try {
      const newAccount: LocalAccount = {
        id: crypto.randomUUID(),
        familyId: currentFamily.id,
        name: accountName.trim(),
        accountType,
        institution: institution.trim() || null,
        initialBalanceCents: initialBalance,
        balanceAsOf: new Date().toISOString().slice(0, 10),
        color: null,
        icon: 'Wallet',
        isActive: true,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        version: 1,
        syncStatus: 'pending',
      };

      await db.executeLocalMutation(db.accounts, 'accounts', newAccount, 'insert');

      setIsAddAccountOpen(false);
      setAccountName('');
      setInstitution('');
      setInitialBalance(0);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (account: LocalAccount) => {
    const hasMovements = movements.some((movement) => movement.accountId === account.id);
    const message = hasMovements
      ? `Excluir “${account.name}” da lista? O saldo e o histórico permanecem preservados, mas a conta não poderá receber novos lançamentos.`
      : `Excluir “${account.name}”?`;

    if (!window.confirm(message)) return;
    try {
      await softDeleteFinancialEntity(db.accounts, 'accounts', account);
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir a conta.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFamily || !user || !originId || !destId || transferAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await createTransfer({
        familyId: currentFamily.id,
        userId: user.id,
        originAccountId: originId,
        destinationAccountId: destId,
        amountCents: transferAmount,
        transferDate: new Date().toISOString().slice(0, 10),
        description: transferDesc.trim() || 'Transferência entre contas',
      });

      setIsTransferOpen(false);
      setTransferAmount(0);
      setTransferDesc('');
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar transferência');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Contas Bancárias & Carteiras"
        subtitle="Gerencie seus saldos reais e transferências"
        rightAction={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={accounts.length < 2}
              leftIcon={<ArrowLeftRight className="w-4 h-4" />}
              onClick={() => {
                setOriginId(accounts[0]?.id || '');
                setDestId(accounts[1]?.id || '');
                setIsTransferOpen(true);
              }}
            >
              Transferir
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setIsAddAccountOpen(true)}
            >
              Nova Conta
            </Button>
          </div>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet className="w-8 h-8" />}
          title="Nenhuma conta cadastrada"
          description="Cadastre suas contas bancárias, poupança ou dinheiro em carteira para controlar seu saldo de caixa real."
          actionLabel="Adicionar Conta"
          onAction={() => setIsAddAccountOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const accMovements = movements.filter((m) => m.accountId === acc.id);
            const currentBalance = calculateAccountBalance(acc.initialBalanceCents, accMovements);

            return (
              <div
                key={acc.id}
                className="p-5 rounded-card bg-background-card border border-border shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-background-elevated text-brand-primary flex items-center justify-center">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        {acc.name}
                      </h3>
                      <span className="text-[11px] text-text-secondary">
                        {acc.institution || 'Conta Bancária'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-background-elevated border border-border uppercase font-semibold text-text-secondary">
                      {acc.accountType === 'checking'
                        ? 'Corrente'
                        : acc.accountType === 'savings'
                        ? 'Poupança'
                        : acc.accountType === 'wallet'
                        ? 'Carteira'
                        : 'Investimento'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc)}
                      title="Excluir conta"
                      className="p-1.5 rounded-lg text-text-secondary hover:bg-financial-expense/10 hover:text-financial-expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 pt-2 border-t border-border">
                  <span className="text-xs text-text-secondary">Saldo Atual</span>
                  <MoneyDisplay cents={currentBalance} size="lg" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Nova Conta */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateAccount}
            className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
          >
            <h3 className="text-lg font-bold text-text-primary">
              Cadastrar Nova Conta
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Nome da Conta</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex.: Nubank Conta, Itaú Principal..."
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Tipo de Conta</label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="wallet">Dinheiro Físico / Carteira</option>
                <option value="investment">Investimento / Reserva</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Instituição (Opcional)</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Ex.: Banco do Brasil, Bradesco..."
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <CurrencyInput
              label="Saldo Inicial (R$)"
              value={initialBalance}
              onChange={setInitialBalance}
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsAddAccountOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Criar Conta
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Transferência */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleTransfer}
            className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
          >
            <h3 className="text-lg font-bold text-text-primary">
              Transferência entre Contas
            </h3>

            <CurrencyInput
              label="Valor a Transferir"
              value={transferAmount}
              onChange={setTransferAmount}
              autoFocus
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Conta Origem (Sai)</label>
                <select
                  required
                  value={originId}
                  onChange={(e) => setOriginId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Conta Destino (Entra)</label>
                <select
                  required
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {accounts
                    .filter((acc) => acc.id !== originId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Descrição (Opcional)</label>
              <input
                type="text"
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                placeholder="Ex.: Reserva para gastos fixos"
                className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={transferAmount <= 0 || originId === destId}>
                Confirmar Transferência
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
