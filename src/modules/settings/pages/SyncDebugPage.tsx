import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { db } from '@/infrastructure/local/db';
import { syncEngine } from '@/infrastructure/sync/sync-engine';
import { useSync } from '@/infrastructure/sync/SyncContext';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface OutboxItem {
  operationId: string;
  entityType: string;
  operationType: string;
  status: string;
  attempts: number;
  nextAttemptAt: string;
  lastErrorCode?: string;
  createdAt: string;
  payload: any;
}

export const SyncDebugPage: React.FC = () => {
  const syncContext = useSync();
  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>([]);
  const [isLoadingSyncLog, setIsLoadingSyncLog] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  const loadOutbox = async () => {
    const items = await db.outbox.toArray();
    setOutboxItems(items as any);
  };

  const forceSyncWithLog = async () => {
    setIsLoadingSyncLog(true);
    setSyncLog([]);
    
    const logs: string[] = [];
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;

    // Intercepta logs do sync engine
    console.error = (...args) => {
      logs.push(`[ERROR] ${args.join(' ')}`);
      originalConsoleError(...args);
    };
    console.warn = (...args) => {
      logs.push(`[WARN] ${args.join(' ')}`);
      originalConsoleWarn(...args);
    };
    console.log = (...args) => {
      logs.push(`[LOG] ${args.join(' ')}`);
      originalConsoleLog(...args);
    };

    try {
      await syncEngine.syncNow();
      logs.push('[SUCCESS] Sincronização concluída');
    } catch (err: any) {
      logs.push(`[FATAL] ${err.message || 'Erro desconhecido'}`);
    } finally {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
      setSyncLog(logs);
      setIsLoadingSyncLog(false);
      loadOutbox();
    }
  };

  const clearOutbox = async () => {
    if (confirm('Deseja DELETAR todas as operações pendentes do outbox? Elas NÃO serão sincronizadas!')) {
      await db.outbox.clear();
      loadOutbox();
    }
  };

  const clearAllData = async () => {
    if (
      confirm(
        'ATENÇÃO: Isso vai apagar TODOS os dados locais (contas, cartões, transações, etc). Confirma?'
      )
    ) {
      await db.delete();
      window.location.href = '/';
    }
  };

  useEffect(() => {
    loadOutbox();
  }, []);

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      <PageHeader title="Diagnóstico de Sincronização" subtitle="Depuração técnica" />

      {/* Status Atual */}
      <div className="p-5 rounded-card bg-background-card border border-border">
        <h3 className="text-sm font-bold text-text-primary mb-3">Status Atual</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-text-secondary">Conexão:</span>
            <span
              className={`ml-2 font-semibold ${
                syncContext.isOnline ? 'text-financial-income' : 'text-financial-expense'
              }`}
            >
              {syncContext.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">Sincronizando:</span>
            <span className="ml-2 font-semibold text-text-primary">
              {syncContext.isSyncing ? '⏳ Sim' : '✅ Não'}
            </span>
          </div>
          <div>
            <span className="text-text-secondary">Operações pendentes:</span>
            <span className="ml-2 font-bold text-brand-primary">{syncContext.pendingCount}</span>
          </div>
          <div>
            <span className="text-text-secondary">Última sincronização:</span>
            <span className="ml-2 text-text-primary">
              {syncContext.lastSyncAt
                ? new Date(syncContext.lastSyncAt).toLocaleString('pt-BR')
                : 'Nunca'}
            </span>
          </div>
        </div>

        {syncContext.lastError && (
          <div className="mt-3 p-3 rounded-lg bg-financial-expense/10 border border-financial-expense/30 text-sm text-financial-expense flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{syncContext.lastError}</span>
          </div>
        )}
      </div>

      {/* Ações Rápidas */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={forceSyncWithLog}
          isLoading={isLoadingSyncLog}
        >
          Forçar Sincronização (com Log)
        </Button>
        <Button variant="outline" size="sm" onClick={loadOutbox}>
          Recarregar Outbox
        </Button>
        <Button variant="danger" size="sm" onClick={clearOutbox}>
          Limpar Outbox
        </Button>
        <Button variant="danger" size="sm" onClick={clearAllData}>
          🗑️ Resetar Tudo (Danger!)
        </Button>
      </div>

      {/* Log de Sincronização */}
      {syncLog.length > 0 && (
        <div className="p-4 rounded-card bg-background-elevated border border-border">
          <h3 className="text-sm font-bold text-text-primary mb-2">Log da Última Tentativa</h3>
          <div className="font-mono text-xs text-text-secondary space-y-1 max-h-60 overflow-y-auto">
            {syncLog.map((log, idx) => (
              <div
                key={idx}
                className={`${
                  log.includes('[ERROR]') || log.includes('[FATAL]')
                    ? 'text-financial-expense'
                    : log.includes('[WARN]')
                    ? 'text-financial-warning'
                    : log.includes('[SUCCESS]')
                    ? 'text-financial-income'
                    : 'text-text-secondary'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fila de Operações (Outbox) */}
      <div className="p-5 rounded-card bg-background-card border border-border">
        <h3 className="text-sm font-bold text-text-primary mb-3">
          Fila de Operações ({outboxItems.length})
        </h3>

        {outboxItems.length === 0 ? (
          <div className="text-center py-8 text-sm text-text-secondary flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-financial-income" />
            <span>Nenhuma operação pendente</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {outboxItems.map((item) => (
              <details
                key={item.operationId}
                className="p-3 rounded-lg bg-background-elevated border border-border text-sm"
              >
                <summary className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.status === 'pending' ? (
                      <AlertTriangle className="w-4 h-4 text-financial-warning" />
                    ) : (
                      <XCircle className="w-4 h-4 text-financial-expense" />
                    )}
                    <span className="font-semibold text-text-primary">
                      {item.entityType} / {item.operationType}
                    </span>
                    <span className="text-xs text-text-secondary">
                      (tentativas: {item.attempts})
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {new Date(item.createdAt).toLocaleString('pt-BR', {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </summary>

                <div className="mt-3 space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-text-secondary">ID da Operação:</span>
                    <span className="ml-2 font-mono text-text-primary">{item.operationId}</span>
                  </div>
                  {item.lastErrorCode && (
                    <div>
                      <span className="font-semibold text-financial-expense">Último Erro:</span>
                      <span className="ml-2 text-financial-expense">{item.lastErrorCode}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-text-secondary">Próxima Tentativa:</span>
                    <span className="ml-2 text-text-primary">
                      {new Date(item.nextAttemptAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-text-secondary">Payload:</span>
                    <pre className="mt-1 p-2 rounded bg-background-card text-[10px] overflow-x-auto">
                      {JSON.stringify(item.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
