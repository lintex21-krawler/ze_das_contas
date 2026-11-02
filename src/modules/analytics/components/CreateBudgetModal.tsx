import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { db } from '@/infrastructure/local/db';
import { MoneyCents } from '@/domain/money/money';
import { LocalBudget, LocalCategory } from '@/infrastructure/local/types';

interface CreateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  referenceMonth: string;
  categories: LocalCategory[];
}

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  isOpen,
  onClose,
  familyId,
  referenceMonth,
  categories,
}) => {
  const [categoryId, setCategoryId] = useState<string>('');
  const [limitCents, setLimitCents] = useState<MoneyCents>(50000); // Padrão R$ 500,00
  const [perspective, setPerspective] = useState<'competence' | 'cash'>('competence');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitCents <= 0) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const budget: LocalBudget = {
        id: crypto.randomUUID(),
        familyId,
        categoryId: categoryId || null,
        referenceMonth,
        limitCents,
        perspective,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
        syncStatus: 'pending',
      };

      await db.executeLocalMutation(db.budgets, 'budgets', budget, 'insert');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar orçamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
      >
        <h3 className="text-lg font-bold text-text-primary">Definir Orçamento Mensal</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Categoria Alvo</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            <option value="">Orçamento Geral (Todas as categorias)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <CurrencyInput label="Teto de Gastos (Limite)" value={limitCents} onChange={setLimitCents} />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Visão Considerada</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPerspective('competence')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                perspective === 'competence'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-background-elevated text-text-secondary border-border'
              }`}
            >
              Competência
            </button>
            <button
              type="button"
              onClick={() => setPerspective('cash')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                perspective === 'cash'
                  ? 'bg-brand-primary text-white border-brand-primary'
                  : 'bg-background-elevated text-text-secondary border-border'
              }`}
            >
              Caixa
            </button>
          </div>
        </div>

        <p className="text-xs text-text-secondary">
          Você receberá alertas não-punitivos e sugestões acolhedoras ao atingir 70%, 90% e 100% do teto.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Salvar Teto
          </Button>
        </div>
      </form>
    </div>
  );
};
