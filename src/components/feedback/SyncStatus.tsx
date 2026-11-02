import React from 'react';
import { CheckCircle2, Clock, Loader2, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error';

export interface SyncStatusProps {
  status?: SyncState;
  pendingCount?: number;
  onRetry?: () => void;
  className?: string;
  showText?: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  status = 'synced',
  pendingCount = 0,
  onRetry,
  className,
  showText = true,
}) => {
  const configs = {
    synced: {
      icon: CheckCircle2,
      label: 'Sincronizado',
      color: 'text-financial-income bg-financial-income/10 border-financial-income/20',
      iconClass: 'text-financial-income',
    },
    syncing: {
      icon: Loader2,
      label: 'Sincronizando...',
      color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20',
      iconClass: 'text-brand-primary animate-spin',
    },
    pending: {
      icon: Clock,
      label: `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`,
      color: 'text-financial-warning bg-financial-warning/10 border-financial-warning/20',
      iconClass: 'text-financial-warning',
    },
    offline: {
      icon: WifiOff,
      label: 'Offline',
      color: 'text-text-secondary bg-background-elevated border-border',
      iconClass: 'text-text-secondary',
    },
    error: {
      icon: AlertTriangle,
      label: 'Erro de sincronização',
      color: 'text-financial-expense bg-financial-expense/10 border-financial-expense/20',
      iconClass: 'text-financial-expense',
    },
  };

  const current = configs[status];
  const Icon = current.icon;

  return (
    <div
      onClick={status === 'error' && onRetry ? onRetry : undefined}
      title={current.label}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium select-none transition-colors',
        current.color,
        status === 'error' && onRetry && 'cursor-pointer hover:underline',
        className
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', current.iconClass)} />
      {showText && <span>{current.label}</span>}
      {status === 'error' && onRetry && (
        <span className="underline ml-1 font-semibold">Tentar</span>
      )}
    </div>
  );
};
