import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { LocalAccount } from './types';

describe('Local Database & Outbox (Dexie)', () => {
  beforeEach(async () => {
    await db.accounts.clear();
    await db.outbox.clear();
  });

  it('deve gravar entidade local e enfileirar no outbox atomicamente via executeLocalMutation', async () => {
    const account: LocalAccount = {
      id: 'acc-uuid-1',
      familyId: 'fam-uuid-1',
      name: 'Nubank Familiar',
      accountType: 'checking',
      institution: 'Nubank',
      initialBalanceCents: 50000, // R$ 500,00
      balanceAsOf: '2026-11-01',
      color: '#820AD1',
      icon: 'Wallet',
      isActive: true,
      createdBy: 'user-uuid-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };

    const operationId = await db.executeLocalMutation(
      db.accounts,
      'accounts',
      account,
      'insert'
    );

    expect(operationId).toBeDefined();

    // 1. Verifica persistência na tabela local
    const savedAccount = await db.accounts.get('acc-uuid-1');
    expect(savedAccount).toBeDefined();
    expect(savedAccount?.name).toBe('Nubank Familiar');
    expect(savedAccount?.initialBalanceCents).toBe(50000);
    expect(savedAccount?.syncStatus).toBe('pending');

    // 2. Verifica registro atômico na fila outbox
    const outboxItem = await db.outbox.get(operationId);
    expect(outboxItem).toBeDefined();
    expect(outboxItem?.entityType).toBe('accounts');
    expect(outboxItem?.entityId).toBe('acc-uuid-1');
    expect(outboxItem?.operationType).toBe('insert');
    expect(outboxItem?.status).toBe('pending');
    expect(outboxItem?.baseVersion).toBe(1);
    expect(outboxItem?.payload.name).toBe('Nubank Familiar');
  });
});
