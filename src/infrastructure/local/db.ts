import Dexie, { type Table } from 'dexie';
import {
  LocalAccount,
  LocalCard,
  LocalCategory,
  LocalTransaction,
  LocalInstallmentPlan,
  LocalInvoice,
  LocalInstallment,
  LocalInvoicePayment,
  LocalTransfer,
  LocalAccountMovement,
  LocalBudget,
  LocalFinancialGoal,
  LocalShoppingList,
  LocalShoppingItem,
} from './types';
import { OutboxOperation, SyncMetadata, SyncConflict } from '../sync/types';

export class ZeDatabase extends Dexie {
  accounts!: Table<LocalAccount, string>;
  cards!: Table<LocalCard, string>;
  categories!: Table<LocalCategory, string>;
  transactions!: Table<LocalTransaction, string>;
  installmentPlans!: Table<LocalInstallmentPlan, string>;
  invoices!: Table<LocalInvoice, string>;
  installments!: Table<LocalInstallment, string>;
  invoicePayments!: Table<LocalInvoicePayment, string>;
  transfers!: Table<LocalTransfer, string>;
  accountMovements!: Table<LocalAccountMovement, string>;
  budgets!: Table<LocalBudget, string>;
  financialGoals!: Table<LocalFinancialGoal, string>;
  shoppingLists!: Table<LocalShoppingList, string>;
  shoppingItems!: Table<LocalShoppingItem, string>;
  
  // Sincronização & Offline
  outbox!: Table<OutboxOperation, string>;
  syncMetadata!: Table<SyncMetadata, string>;
  conflicts!: Table<SyncConflict, string>;

  constructor() {
    super('ZeDasContasLocalDB');

    this.version(1).stores({
      accounts: 'id, familyId, accountType, isActive, deletedAt, syncStatus',
      cards: 'id, familyId, accountId, isActive, deletedAt, syncStatus',
      categories: 'id, familyId, transactionType, parentId, isSystemDefault, deletedAt, syncStatus',
      transactions: 'id, familyId, transactionType, transactionDate, competenceMonth, categoryId, accountId, cardId, status, deletedAt, syncStatus',
      installmentPlans: 'id, familyId, originalTransactionId, cardId',
      invoices: 'id, familyId, cardId, cycleStart, [cardId+cycleStart], referenceMonth, status',
      installments: 'id, familyId, planId, invoiceId, dueDate, competenceMonth, status',
      invoicePayments: 'id, familyId, invoiceId, accountId, operationId',
      transfers: 'id, familyId, originAccountId, destinationAccountId, transferDate, operationId',
      accountMovements: 'id, familyId, accountId, movementType, effectiveDate, operationId',
      budgets: 'id, familyId, categoryId, referenceMonth, perspective',
      financialGoals: 'id, familyId, status',
      shoppingLists: 'id, familyId, status',
      shoppingItems: 'id, familyId, listId, isChecked',
      
      // Filas e Metadados de Sincronização
      outbox: 'operationId, familyId, entityType, status, nextAttemptAt, createdAt',
      syncMetadata: 'id, familyId, entityType',
      conflicts: 'id, familyId, entityType, status',
    });
  }

  /**
   * Grava uma mutação localmente e adiciona à fila de saída (Outbox)
   * dentro de uma ÚNICA transação atômica no IndexedDB.
   */
  async executeLocalMutation<T extends { id: string; familyId: string; version: number }>(
    table: Table<T, string>,
    entityType: OutboxOperation['entityType'],
    entity: T,
    operationType: 'insert' | 'update' | 'delete'
  ): Promise<string> {
    const operationId = crypto.randomUUID();
    const now = new Date().toISOString();

    const outboxItem: OutboxOperation = {
      operationId,
      familyId: entity.familyId,
      entityType,
      entityId: entity.id,
      operationType,
      payload: entity,
      baseVersion: entity.version,
      createdAt: now,
      attempts: 0,
      nextAttemptAt: now,
      status: 'pending',
      lastErrorCode: null,
    };

    await this.transaction('rw', [table, this.outbox], async () => {
      await table.put(entity);
      await this.outbox.add(outboxItem);
    });

    return operationId;
  }
}

export const db = new ZeDatabase();
