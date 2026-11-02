import { MoneyCents } from '@/domain/money/money';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface BaseLocalEntity {
  id: string; // UUID v4
  familyId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
  syncStatus: SyncStatus;
}

export interface LocalAccount extends BaseLocalEntity {
  name: string;
  accountType: 'checking' | 'savings' | 'wallet' | 'investment' | 'other';
  institution: string | null;
  initialBalanceCents: MoneyCents;
  balanceAsOf: string;
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface LocalCard extends BaseLocalEntity {
  accountId: string | null;
  name: string;
  institution: string | null;
  creditLimitCents: MoneyCents;
  closingDay: number;
  dueDay: number;
  closingDayPolicy: 'include_closing_day' | 'exclude_closing_day';
  color: string | null;
  isActive: boolean;
  createdBy: string;
}

export interface LocalCategory extends BaseLocalEntity {
  name: string;
  parentId: string | null;
  transactionType: 'expense' | 'income' | 'both';
  essentiality: 'essential' | 'non_essential' | 'unset';
  color: string | null;
  icon: string | null;
  isSystemDefault: boolean;
  isActive: boolean;
}

export interface LocalTransaction extends BaseLocalEntity {
  transactionType: 'expense' | 'income' | 'adjustment';
  description: string;
  amountCents: MoneyCents;
  transactionDate: string; // 'YYYY-MM-DD'
  competenceMonth: string | null; // 'YYYY-MM-01'
  cashDate: string | null;
  categoryId: string | null;
  paymentMethod: 'cash' | 'pix' | 'debit' | 'credit' | 'other' | null;
  accountId: string | null;
  cardId: string | null;
  status: 'planned' | 'pending' | 'settled' | 'cancelled';
  notes: string | null;
  shoppingListId: string | null;
  createdBy: string;
  updatedBy: string;
  source: string;
}

export interface LocalInstallmentPlan extends BaseLocalEntity {
  originalTransactionId: string;
  totalAmountCents: MoneyCents;
  installmentCount: number;
  cardId: string;
}

export interface LocalInvoice extends BaseLocalEntity {
  cardId: string;
  cycleStart: string;
  closingDate: string;
  dueDate: string;
  referenceMonth: string;
  status: 'open' | 'closed' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  paidAmountCents: MoneyCents;
}

export interface LocalInstallment extends BaseLocalEntity {
  planId: string;
  invoiceId: string;
  installmentNumber: number;
  amountCents: MoneyCents;
  dueDate: string;
  competenceMonth: string;
  status: 'planned' | 'pending' | 'settled' | 'cancelled';
}

export interface LocalInvoicePayment extends BaseLocalEntity {
  invoiceId: string;
  accountId: string;
  amountCents: MoneyCents;
  paidAt: string;
  createdBy: string;
  operationId: string;
}

export interface LocalTransfer extends BaseLocalEntity {
  originAccountId: string;
  destinationAccountId: string;
  amountCents: MoneyCents;
  transferDate: string;
  status: 'planned' | 'settled' | 'cancelled';
  description: string | null;
  operationId: string;
  createdBy: string;
}

export interface LocalAccountMovement extends BaseLocalEntity {
  accountId: string;
  movementType: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'invoice_payment' | 'adjustment';
  amountCents: MoneyCents;
  effectiveDate: string;
  sourceEntity: string;
  sourceId: string;
  operationId: string;
}

export interface LocalBudget extends BaseLocalEntity {
  categoryId: string | null; // null = orçamento geral
  referenceMonth: string;
  limitCents: MoneyCents;
  perspective: 'competence' | 'cash';
}

export interface LocalFinancialGoal extends BaseLocalEntity {
  name: string;
  targetAmountCents: MoneyCents;
  currentAmountCents: MoneyCents;
  targetDate: string | null;
  status: 'active' | 'completed' | 'cancelled';
}

export interface LocalShoppingList extends BaseLocalEntity {
  name: string;
  status: 'active' | 'completed' | 'archived';
  createdBy: string;
  completedAt: string | null;
}

export interface LocalShoppingItem extends BaseLocalEntity {
  listId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPriceCents: MoneyCents | null;
  actualPriceCents: MoneyCents | null;
  isChecked: boolean;
  itemOrder: number;
}
