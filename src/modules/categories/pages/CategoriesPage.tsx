import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Tag, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { LocalCategory } from '@/infrastructure/local/types';
import { cn } from '@/shared/utils/cn';

export const CategoriesPage: React.FC = () => {
  const { currentFamily } = useAuth();
  const familyId = currentFamily?.id || '';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocalCategory | null>(null);

  // Consulta reativa às categorias
  const categories = useLiveQuery(
    () => db.categories.where('familyId').equals(familyId).filter((c) => !c.deletedAt).toArray(),
    [familyId]
  ) || [];

  // Separa categorias de receitas e despesas
  const expenseCategories = categories.filter((c) => c.transactionType === 'expense' && !c.parentId);
  const incomeCategories = categories.filter((c) => c.transactionType === 'income' && !c.parentId);

  const handleToggleActive = async (category: LocalCategory) => {
    const now = new Date().toISOString();
    await db.categories.update(category.id, {
      isActive: !category.isActive,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover esta categoria? Lançamentos existentes não serão afetados.')) return;
    const now = new Date().toISOString();
    await db.categories.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Categorias"
        subtitle="Organize e personalize suas categorias de receitas e despesas"
        rightAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Nova Categoria
          </Button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-8 h-8" />}
          title="Nenhuma categoria cadastrada"
          description="Crie categorias personalizadas para organizar melhor suas receitas e despesas. As categorias padrão do sistema aparecem automaticamente ao criar a primeira transação."
          actionLabel="Criar Primeira Categoria"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Categorias de Despesas */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-financial-expense/15 text-financial-expense flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              Despesas ({expenseCategories.length})
            </h2>

            {expenseCategories.length === 0 ? (
              <p className="text-sm text-text-secondary px-1">
                Nenhuma categoria de despesas personalizada. As categorias padrão do sistema são criadas automaticamente.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {expenseCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={setEditingCategory}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Categorias de Receitas */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-financial-income/15 text-financial-income flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              Receitas ({incomeCategories.length})
            </h2>

            {incomeCategories.length === 0 ? (
              <p className="text-sm text-text-secondary px-1">
                Nenhuma categoria de receitas personalizada.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {incomeCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onEdit={setEditingCategory}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {(isCreateModalOpen || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          familyId={familyId}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
};

// Componente de Card de Categoria
interface CategoryCardProps {
  category: LocalCategory;
  onEdit: (cat: LocalCategory) => void;
  onToggleActive: (cat: LocalCategory) => void;
  onDelete: (id: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onToggleActive, onDelete }) => {
  return (
    <div
      className={cn(
        'p-4 rounded-card border flex flex-col gap-3 transition-all',
        category.isActive
          ? 'bg-background-card border-border'
          : 'bg-background-elevated border-border opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            style={{ backgroundColor: category.color || '#64748B' }}
          >
            <Tag className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-text-primary truncate">
              {category.name}
            </span>
            {category.essentiality !== 'unset' && (
              <span className="text-[10px] text-text-secondary font-medium">
                {category.essentiality === 'essential' ? 'Essencial' : 'Não Essencial'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleActive(category)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
            title={category.isActive ? 'Desativar' : 'Ativar'}
          >
            {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onEdit(category)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-brand-primary hover:bg-background-elevated transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {!category.isSystemDefault && (
            <button
              type="button"
              onClick={() => onDelete(category.id)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-financial-expense hover:bg-background-elevated transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal de Criação/Edição de Categoria
interface CategoryModalProps {
  category: LocalCategory | null;
  familyId: string;
  onClose: () => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, familyId, onClose }) => {
  const [name, setName] = useState(category?.name || '');
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'both'>(
    category?.transactionType || 'expense'
  );
  const [color, setColor] = useState(category?.color || '#10B981');
  const [essentiality, setEssentiality] = useState<'essential' | 'non_essential' | 'unset'>(
    category?.essentiality || 'unset'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      if (category) {
        // Edição
        await db.categories.update(category.id, {
          name: name.trim(),
          color,
          essentiality,
          updatedAt: now,
          syncStatus: 'pending',
        });
      } else {
        // Criação
        const newCategory: LocalCategory = {
          id: crypto.randomUUID(),
          familyId,
          name: name.trim(),
          transactionType,
          parentId: null,
          color,
          icon: 'Tag',
          essentiality,
          isSystemDefault: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          version: 1,
          syncStatus: 'pending',
        };
        await db.executeLocalMutation(db.categories, 'categories', newCategory, 'insert');
      }

      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar categoria');
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
        <h3 className="text-lg font-bold text-text-primary">
          {category ? 'Editar Categoria' : 'Nova Categoria'}
        </h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Nome da Categoria</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Lazer, Alimentação, Freelance..."
            className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        {!category && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransactionType('expense')}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                  transactionType === 'expense'
                    ? 'bg-financial-expense text-white border-financial-expense'
                    : 'bg-background-elevated text-text-secondary border-border'
                )}
              >
                Despesa
              </button>
              <button
                type="button"
                onClick={() => setTransactionType('income')}
                className={cn(
                  'py-2 px-3 rounded-xl text-xs font-semibold border transition-all',
                  transactionType === 'income'
                    ? 'bg-financial-income text-white border-financial-income'
                    : 'bg-background-elevated text-text-secondary border-border'
                )}
              >
                Receita
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Cor</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-12 rounded-xl cursor-pointer border-0"
            />
            <div className="flex flex-wrap gap-2">
              {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? '#000' : 'transparent',
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Essencialidade</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'essential', label: 'Essencial' },
              { value: 'non_essential', label: 'Não Essencial' },
              { value: 'unset', label: 'Não Definir' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEssentiality(opt.value as any)}
                className={cn(
                  'py-2 px-2 rounded-xl text-xs font-semibold border transition-all',
                  essentiality === opt.value
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-background-elevated text-text-secondary border-border'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {category ? 'Salvar Alterações' : 'Criar Categoria'}
          </Button>
        </div>
      </form>
    </div>
  );
};
