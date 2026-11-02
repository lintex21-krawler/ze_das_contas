export type OutboxStatus = 'pending' | 'processing' | 'failed' | 'completed';

export interface OutboxOperation {
  operationId: string; // UUID v4 único
  familyId: string;
  entityType:
    | 'accounts'
    | 'cards'
    | 'categories'
    | 'transactions'
    | 'installment_plans'
    | 'installments'
    | 'invoices'
    | 'invoice_payments'
    | 'transfers'
    | 'account_movements'
    | 'shopping_lists'
    | 'shopping_items'
    | 'budgets'
    | 'financial_goals';
  entityId: string;
  operationType: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  baseVersion: number;
  createdAt: string;
  attempts: number;
  nextAttemptAt: string;
  status: OutboxStatus;
  lastErrorCode: string | null;
}

export interface SyncMetadata {
  id: string; // `${familyId}_${entityType}`
  familyId: string;
  entityType: string;
  lastSyncAt: string;
  lastRemoteCursor: string | null;
}

export interface SyncConflict {
  id: string;
  familyId: string;
  entityType: string;
  entityId: string;
  localPayload: Record<string, any>;
  remotePayload: Record<string, any>;
  baseVersion: number;
  remoteVersion: number;
  createdAt: string;
  status: 'unresolved' | 'resolved';
}
