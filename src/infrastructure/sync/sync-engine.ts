import { db } from '../local/db';
import { supabase } from '../supabase/client';
import { OutboxOperation } from './types';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  lastError: string | null;
}

type StatusListener = (status: SyncEngineStatus) => void;

// Ordem de dependência para inserção / atualização segura
const DEPENDENCY_ORDER: Record<OutboxOperation['entityType'], number> = {
  accounts: 1,
  cards: 2,
  categories: 3,
  transactions: 4,
  installment_plans: 5,
  invoices: 6,
  installments: 7,
  invoice_payments: 8,
  transfers: 9,
  budgets: 10,
  financial_goals: 11,
  shopping_lists: 12,
  shopping_items: 13,
};

// Conversor camelCase -> snake_case para comunicação com o PostgreSQL
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Ignora campos internos de controle do Dexie
    if (key === 'syncStatus') continue;

    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Conversor snake_case -> camelCase para o Dexie
export function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  result.syncStatus = 'synced';
  return result;
}

export class SyncEngine {
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private pendingCount = 0;
  private lastSyncAt: Date | null = null;
  private lastError: string | null = null;
  private listeners: Set<StatusListener> = new Set();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.initListeners();
    this.updatePendingCount();
  }

  private initListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.broadcast();
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.broadcast();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isOnline) {
        this.syncNow();
      }
    });

    // Loop de sincronização periódica a cada 60 segundos se online
    this.timer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow();
      }
    }, 60000);
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  public getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    };
  }

  private broadcast() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }

  public async updatePendingCount(): Promise<number> {
    try {
      this.pendingCount = await db.outbox.where('status').equals('pending').count();
      this.broadcast();
      return this.pendingCount;
    } catch {
      return 0;
    }
  }

  /**
   * Dispara ciclo de sincronização completo (Push pendências -> Pull novidades)
   */
  public async syncNow(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.lastError = null;
    this.broadcast();

    try {
      await this.pushPendingOperations();
      this.lastSyncAt = new Date();
    } catch (err: any) {
      console.warn('Falha transitória na sincronização:', err);
      this.lastError = err.message || 'Erro durante a sincronização';
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
      this.broadcast();
    }
  }

  /**
   * 1. PUSH: Envia operações acumuladas na fila local (Outbox) para o Supabase
   */
  private async pushPendingOperations(): Promise<void> {
    const now = new Date().toISOString();
    const pendingItems = await db.outbox
      .where('status')
      .equals('pending')
      .filter((item) => item.nextAttemptAt <= now)
      .toArray();

    if (pendingItems.length === 0) return;

    // Ordena pela hierarquia de dependência
    pendingItems.sort((a, b) => {
      const orderA = DEPENDENCY_ORDER[a.entityType] || 99;
      const orderB = DEPENDENCY_ORDER[b.entityType] || 99;
      return orderA - orderB;
    });

    for (const item of pendingItems) {
      try {
        await this.processOutboxItem(item);

        // Operação concluída com sucesso: remove do outbox
        await db.outbox.delete(item.operationId);
      } catch (err: any) {
        console.error(`Erro ao sincronizar operação ${item.operationId}:`, err);

        // Backoff exponencial com jitter (2s, 4s, 8s, 16s... máx 5 min)
        const attempts = item.attempts + 1;
        const baseDelaySec = Math.min(Math.pow(2, attempts), 300);
        const jitterSec = Math.floor(Math.random() * 3);
        const nextDate = new Date();
        nextDate.setSeconds(nextDate.getSeconds() + baseDelaySec + jitterSec);

        await db.outbox.update(item.operationId, {
          attempts,
          nextAttemptAt: nextDate.toISOString(),
          lastErrorCode: err.code || err.message,
        });

        // Se for erro de validação/conflito permanente, não interrompe as demais entidades
      }
    }
  }

  /**
   * Processa uma única operação do outbox contra o Supabase
   */
  private async processOutboxItem(item: OutboxOperation): Promise<void> {
    const tableName = item.entityType;
    const remoteData = toSnakeCase(item.payload);

    if (item.operationType === 'insert') {
      const { error } = await supabase.from(tableName).upsert(remoteData, {
        onConflict: 'id',
      });
      if (error) throw error;
    } else if (item.operationType === 'update') {
      const { error } = await supabase
        .from(tableName)
        .update(remoteData)
        .eq('id', item.entityId)
        .eq('family_id', item.familyId);
      if (error) throw error;
    } else if (item.operationType === 'delete') {
      // Soft-delete
      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', item.entityId)
        .eq('family_id', item.familyId);
      if (error) throw error;
    }

    // Registra a operação concluída na tabela de controle de sincronização remota
    await supabase.from('sync_operations').upsert({
      operation_id: item.operationId,
      family_id: item.familyId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      entity_type: item.entityType,
      operation_type: item.operationType,
      result_data: { status: 'success' },
    });
  }

  public destroy() {
    if (this.timer) clearInterval(this.timer);
    this.listeners.clear();
  }
}

export const syncEngine = new SyncEngine();
