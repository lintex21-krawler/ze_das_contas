import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ShoppingCart, Plus, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/infrastructure/local/db';
import { LocalShoppingList, LocalShoppingItem } from '@/infrastructure/local/types';
import { cn } from '@/shared/utils/cn';

export const ShoppingListsPage: React.FC = () => {
  const { currentFamily, user } = useAuth();
  const familyId = currentFamily?.id || '';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<LocalShoppingList | null>(null);

  // Consulta reativa às listas
  const lists = useLiveQuery(
    () =>
      db.shoppingLists
        .where('familyId')
        .equals(familyId)
        .filter((l) => !l.deletedAt)
        .reverse()
        .sortBy('createdAt'),
    [familyId]
  ) || [];

  const activeLists = lists.filter((l) => l.status === 'active');
  const completedLists = lists.filter((l) => l.status === 'completed');

  const handleCreateList = async (name: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const newList: LocalShoppingList = {
      id: crypto.randomUUID(),
      familyId,
      name: name.trim(),
      status: 'active',
      createdBy: user.id,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };
    await db.executeLocalMutation(db.shoppingLists, 'shopping_lists', newList, 'insert');
  };

  const handleCompleteList = async (list: LocalShoppingList) => {
    const now = new Date().toISOString();
    await db.shoppingLists.update(list.id, {
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('Deseja excluir esta lista de compras?')) return;
    const now = new Date().toISOString();
    await db.shoppingLists.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Listas de Compras"
        subtitle="Organize compras em família e acompanhe em tempo real"
        rightAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Nova Lista
          </Button>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Nenhuma lista de compras"
          description="Crie listas compartilhadas com a família. Todos podem adicionar itens e marcar o que já foi comprado em tempo real."
          actionLabel="Criar Primeira Lista"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Listas Ativas */}
          {activeLists.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                Listas Ativas ({activeLists.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeLists.map((list) => (
                  <ListCard
                    key={list.id}
                    list={list}
                    onOpen={setSelectedList}
                    onComplete={handleCompleteList}
                    onDelete={handleDeleteList}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Listas Concluídas */}
          {completedLists.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                <Check className="w-4 h-4" />
                Concluídas ({completedLists.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {completedLists.map((list) => (
                  <div
                    key={list.id}
                    className="p-3 rounded-card bg-background-elevated border border-border flex items-center justify-between gap-2 opacity-60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-4 h-4 text-financial-income shrink-0" />
                      <span className="text-sm font-medium text-text-primary truncate">{list.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id)}
                      className="text-text-secondary hover:text-financial-expense p-1 transition-colors shrink-0"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal de Criação */}
      {isCreateModalOpen && (
        <CreateListModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateList}
        />
      )}

      {/* Modal de Visualização/Edição de Itens */}
      {selectedList && (
        <ListItemsModal list={selectedList} onClose={() => setSelectedList(null)} />
      )}
    </div>
  );
};

// Card de Lista
interface ListCardProps {
  list: LocalShoppingList;
  onOpen: (list: LocalShoppingList) => void;
  onComplete: (list: LocalShoppingList) => void;
  onDelete: (id: string) => void;
}

const ListCard: React.FC<ListCardProps> = ({ list, onOpen, onComplete, onDelete }) => {
  const items = useLiveQuery(
    () => db.shoppingItems.where('listId').equals(list.id).filter((i) => !i.deletedAt).toArray(),
    [list.id]
  ) || [];

  const checkedCount = items.filter((i) => i.isPurchased).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="p-4 rounded-card bg-background-card border border-border flex flex-col gap-3 hover:border-brand-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => onOpen(list)}
          className="flex flex-col gap-1 min-w-0 flex-1 text-left"
        >
          <span className="font-bold text-base text-text-primary truncate">{list.name}</span>
          <span className="text-xs text-text-secondary">
            {checkedCount} de {items.length} itens comprados
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {progress === 100 && items.length > 0 && (
            <button
              type="button"
              onClick={() => onComplete(list)}
              className="p-1.5 rounded-lg text-financial-income hover:bg-financial-income/10 transition-colors"
              title="Concluir lista"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(list.id)}
            className="p-1.5 rounded-lg text-text-secondary hover:text-financial-expense hover:bg-background-elevated transition-colors"
            title="Excluir lista"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Progresso */}
      {items.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="w-full h-2 rounded-full bg-background-elevated overflow-hidden">
            <div
              className="h-full bg-brand-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => onOpen(list)} className="w-full text-xs">
        Abrir Lista
      </Button>
    </div>
  );
};

// Modal de Criação de Lista
interface CreateListModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const CreateListModal: React.FC<CreateListModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(name);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar lista');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
      >
        <h3 className="text-lg font-bold text-text-primary">Nova Lista de Compras</h3>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Nome da Lista</label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Compras do Mês, Feira..."
            className="w-full px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Criar Lista
          </Button>
        </div>
      </form>
    </div>
  );
};

// Modal de Itens da Lista
interface ListItemsModalProps {
  list: LocalShoppingList;
  onClose: () => void;
}

const ListItemsModal: React.FC<ListItemsModalProps> = ({ list, onClose }) => {
  const { currentFamily } = useAuth();
  const [newItemName, setNewItemName] = useState('');

  const items = useLiveQuery(
    () => db.shoppingItems.where('listId').equals(list.id).filter((i) => !i.deletedAt).toArray(),
    [list.id]
  ) || [];

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !currentFamily) return;

    const now = new Date().toISOString();
    const newItem: LocalShoppingItem = {
      id: crypto.randomUUID(),
      familyId: currentFamily.id,
      listId: list.id,
      name: newItemName.trim(),
      quantity: 1,
      unit: 'un',
      estimatedPriceCents: null,
      actualPriceCents: null,
      categoryId: null,
      isPurchased: false,
      purchasedAt: null,
      itemOrder: items.length,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };

    await db.executeLocalMutation(db.shoppingItems, 'shopping_items', newItem, 'insert');
    setNewItemName('');
  };

  const handleToggleItem = async (item: LocalShoppingItem) => {
    const now = new Date().toISOString();
    await db.shoppingItems.update(item.id, {
      isPurchased: !item.isPurchased,
      purchasedAt: !item.isPurchased ? now : null,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  const handleDeleteItem = async (id: string) => {
    const now = new Date().toISOString();
    await db.shoppingItems.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });
  };

  const pendingItems = items.filter((i) => !i.isPurchased);
  const purchasedItems = items.filter((i) => i.isPurchased);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-card bg-background-card border border-border shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/15 text-brand-primary flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary">{list.name}</h3>
              <span className="text-xs text-text-secondary">
                {purchasedItems.length} de {items.length} comprados
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário de Novo Item */}
        <form onSubmit={handleAddItem} className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Adicionar item..."
              className="flex-1 px-3.5 py-2.5 rounded-input bg-background-elevated border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!newItemName.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </form>

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-secondary">
              Nenhum item adicionado. Use o campo acima para adicionar itens.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Itens Pendentes */}
              {pendingItems.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase">
                    A Comprar ({pendingItems.length})
                  </span>
                  {pendingItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}

              {/* Itens Comprados */}
              {purchasedItems.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-text-secondary uppercase">
                    Comprados ({purchasedItems.length})
                  </span>
                  {purchasedItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={handleToggleItem}
                      onDelete={handleDeleteItem}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Linha de Item
interface ItemRowProps {
  item: LocalShoppingItem;
  onToggle: (item: LocalShoppingItem) => void;
  onDelete: (id: string) => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, onToggle, onDelete }) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 p-3 rounded-xl bg-background-elevated border border-border transition-all',
        item.isPurchased && 'opacity-60'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggle(item)}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all',
            item.isPurchased
              ? 'bg-brand-primary border-brand-primary text-white'
              : 'border-border hover:border-brand-primary'
          )}
        >
          {item.isPurchased && <Check className="w-3.5 h-3.5" />}
        </button>
        <span
          className={cn(
            'text-sm font-medium truncate',
            item.isPurchased ? 'line-through text-text-secondary' : 'text-text-primary'
          )}
        >
          {item.name}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="text-text-secondary hover:text-financial-expense p-1 transition-colors shrink-0"
        title="Remover item"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
