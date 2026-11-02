import { db } from '@/infrastructure/local/db';
import { LocalTransaction, LocalAccountMovement } from '@/infrastructure/local/types';
import { MoneyCents } from '@/domain/money/money';
import { syncEngine } from '@/infrastructure/sync/sync-engine';
import { parseISO, format } from 'date-fns';

export interface CreateIncomeInput {
  familyId: string;
  userId: string;
  description: string;
  amountCents: MoneyCents;
  transactionDate: string; // 'YYYY-MM-DD'
  categoryId?: string | null;
  accountId: string;
  status: 'settled' | 'planned';
  notes?: string | null;
}

export async function createIncome(input: CreateIncomeInput): Promise<string> {
  const {
    familyId,
    userId,
    description,
    amountCents,
    transactionDate,
    categoryId = null,
    accountId,
    status,
    notes = null,
  } = input;

  if (amountCents <= 0) {
    throw new Error('O valor da receita deve ser positivo.');
  }

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const transaction: LocalTransaction = {
    id: transactionId,
    familyId,
    transactionType: 'income',
    description,
    amountCents,
    transactionDate,
    competenceMonth: format(parseISO(transactionDate), 'yyyy-MM-01'),
    cashDate: status === 'settled' ? transactionDate : null,
    categoryId,
    paymentMethod: null,
    accountId,
    cardId: null,
    status,
    notes,
    shoppingListId: null,
    createdBy: userId,
    updatedBy: userId,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  await db.executeLocalMutation(db.transactions, 'transactions', transaction, 'insert');

  // Apenas receitas efetivamente recebidas ('settled') geram entrada no saldo real da conta
  if (status === 'settled') {
    const movement: LocalAccountMovement = {
      id: crypto.randomUUID(),
      familyId,
      accountId,
      movementType: 'income',
      amountCents,
      effectiveDate: transactionDate,
      sourceEntity: 'transactions',
      sourceId: transactionId,
      operationId: transactionId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };
    await db.executeLocalMutation(db.accountMovements, 'account_movements', movement, 'insert');
  }

  syncEngine.syncNow().catch(() => {});
  return transactionId;
}
