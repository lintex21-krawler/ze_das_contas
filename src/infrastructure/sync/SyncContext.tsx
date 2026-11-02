import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncEngine, SyncEngineStatus } from './sync-engine';
import { SyncState } from '@/components/feedback/SyncStatus';

interface SyncContextValue extends SyncEngineStatus {
  syncState: SyncState;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  // Mapeia o estado detalhado do motor para o indicador visual simples da UI
  let syncState: SyncState = 'synced';
  if (!status.isOnline) {
    syncState = 'offline';
  } else if (status.isSyncing) {
    syncState = 'syncing';
  } else if (status.lastError) {
    syncState = 'error';
  } else if (status.pendingCount > 0) {
    syncState = 'pending';
  }

  const syncNow = async () => {
    await syncEngine.syncNow();
  };

  return (
    <SyncContext.Provider
      value={{
        ...status,
        syncState,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextValue => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync deve ser utilizado dentro de um SyncProvider');
  }
  return context;
};
