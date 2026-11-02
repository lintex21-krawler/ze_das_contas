import { db } from '@/infrastructure/local/db';
import { LocalTransfer, LocalAccountMovement } from '@/infrastructure/local/types';
import { MoneyCents } from '@/domain/money/money';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

export interface CreateTransferInput {
  familyId: string;
  userId: string;
  originAccountId: string;
  destinationAccountId: string;
  amountCents: MoneyCents;
  transferDate: string; // 'YYYY-MM-DD'
  description?: string | null;
}

export async function createTransfer(input: CreateTransferInput): Promise<string> {
  const {
    familyId,
    userId,
    originAccountId,
    destinationAccountId,
    amountCents,
    transferDate,
    description = null,
  } = input;

  if (originAccountId === destinationAccountId) {
    throw new Error('A conta de origem deve ser diferente da conta de destino.');
  }

  if (amountCents <= 0) {
    throw new Error('O valor da transferência deve ser positivo.');
  }

  const transferId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();

  const transfer: LocalTransfer = {
    id: transferId,
    familyId,
    originAccountId,
    destinationAccountId,
    amountCents,
    transferDate,
    status: 'settled',
    description,
    operationId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  // 1. Perna de saída (transfer_out)
  const movementOut: LocalAccountMovement = {
    id: crypto.randomUUID(),
    familyId,
    accountId: originAccountId,
    movementType: 'transfer_out',
    amountCents,
    effectiveDate: transferDate,
    sourceEntity: 'transfers',
    sourceId: transferId,
    operationId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  // 2. Perna de entrada (transfer_in)
  const movementIn: LocalAccountMovement = {
    id: crypto.randomUUID(),
    familyId,
    accountId: destinationAccountId,
    movementType: 'transfer_in',
    amountCents,
    effectiveDate: transferDate,
    sourceEntity: 'transfers',
    sourceId: transferId,
    operationId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  await db.executeLocalMutation(db.transfers, 'transfers', transfer, 'insert');
  await db.accountMovements.bulkPut([movementOut, movementIn]);

  syncEngine.syncNow().catch(() => {});
  return transferId;
}
