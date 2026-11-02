import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sparkles } from 'lucide-react';
import { MoneyCents } from '@/domain/money/money';
import { cn } from '@/shared/utils/cn';

type TransactionType = 'expense' | 'income' | 'transfer' | 'natural_language';

export const QuickTransactionPage: React.FC = () => {
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<MoneyCents>(0);
  const [description, setDescription] = useState('');
  const [naturalText, setNaturalText] = useState('');

  const typeButtons = [
    { type: 'expense' as const, label: 'Despesa', icon: ArrowDownRight, color: 'text-financial-expense' },
    { type: 'income' as const, label: 'Receita', icon: ArrowUpRight, color: 'text-financial-income' },
    { type: 'transfer' as const, label: 'Transferir', icon: ArrowLeftRight, color: 'text-brand-primary' },
    { type: 'natural_language' as const, label: 'Texto / IA', icon: Sparkles, color: 'text-brand-secondary' },
  ];

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
              onClick={() => setTxType(btn.type)}
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
            className="bg-brand-secondary hover:bg-brand-secondary/90 w-full"
          >
            Interpretar e Revisar
          </Button>
        </div>
      ) : (
        /* Modo Formulário Direto */
        <div className="flex flex-col gap-4 p-5 rounded-card bg-background-card border border-border">
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                txType === 'expense'
                  ? 'Ex.: Mercado, Uber, Farmácia...'
                  : txType === 'income'
                  ? 'Ex.: Salário, Freelance, Reembolso...'
                  : 'Ex.: Reserva de emergência...'
              }
              className="w-full px-4 py-3 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>

          <div className="p-3 rounded-xl bg-background-elevated border border-border text-xs text-text-secondary flex items-center justify-between">
            <span>Disponibilidade imediata:</span>
            <span className="text-financial-income font-medium">✓ Gravação local garantida</span>
          </div>

          <Button
            variant={txType === 'expense' ? 'danger' : 'primary'}
            size="lg"
            disabled={amount <= 0 || !description.trim()}
            className="w-full mt-2"
          >
            Salvar {txType === 'expense' ? 'Despesa' : txType === 'income' ? 'Receita' : 'Transferência'}
          </Button>
        </div>
      )}
    </div>
  );
};
