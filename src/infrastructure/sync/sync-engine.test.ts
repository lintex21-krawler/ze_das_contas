import { describe, it, expect, beforeEach } from 'vitest';
import { syncEngine } from './sync-engine';
import { db } from '../local/db';

describe('SyncEngine (Motor de Sincronização)', () => {
  beforeEach(async () => {
    await db.outbox.clear();
  });

  it('deve fornecer status inicial com contagem de pendências e estado online', async () => {
    const status = syncEngine.getStatus();
    expect(status).toHaveProperty('isOnline');
    expect(status).toHaveProperty('isSyncing');
    expect(status).toHaveProperty('pendingCount');
  });

  it('deve atualizar o contador de pendências reativamente', async () => {
    expect(await syncEngine.updatePendingCount()).toBe(0);

    // Adiciona item pendente
    await db.outbox.add({
      operationId: 'op-1',
      familyId: 'fam-1',
      entityType: 'transactions',
      entityId: 'tx-1',
      operationType: 'insert',
      payload: { description: 'Padaria' },
      baseVersion: 1,
      createdAt: new Date().toISOString(),
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      status: 'pending',
      lastErrorCode: null,
    });

    const pendingCount = await syncEngine.updatePendingCount();
    expect(pendingCount).toBe(1);
    expect(syncEngine.getStatus().pendingCount).toBe(1);
  });
});
