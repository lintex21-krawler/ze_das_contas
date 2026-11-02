import { Table } from 'dexie';
import { db } from '@/infrastructure/local/db';
import { OutboxOperation } from '@/infrastructure/sync/types';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

interface DeletableEntity {
  id: string;
  familyId: string;
  version: number;
  deletedAt: string | null;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
}

/**
 * Remove uma entidade da visão ativa sem apagar seu histórico financeiro.
 * A alteração é enfileirada como operação atômica e enviada ao Supabase.
 */
export async function softDeleteFinancialEntity<T extends DeletableEntity>(
  table: Table<T, string>,
  entityType: OutboxOperation['entityType'],
  entity: T
): Promise<void> {
  const now = new Date().toISOString();
  const deletedEntity: T = {
    ...entity,
    deletedAt: now,
    updatedAt: now,
    version: entity.version + 1,
    syncStatus: 'pending',
  };

  await db.executeLocalMutation(table, entityType, deletedEntity, 'delete');
  syncEngine.syncNow().catch(() => undefined);
}
