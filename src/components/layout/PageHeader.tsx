import React from 'react';
import { SyncStatus, SyncState } from '@/components/feedback/SyncStatus';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  syncStatus?: SyncState;
  pendingCount?: number;
  rightAction?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  syncStatus = 'synced',
  pendingCount = 0,
  rightAction,
}) => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="flex items-center justify-between gap-4 py-4 mb-2">
      <div className="flex flex-col">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <span className="text-xs sm:text-sm text-text-secondary mt-0.5">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <SyncStatus status={syncStatus} pendingCount={pendingCount} />

        {/* Botão de alternar tema visível em mobile */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema"
          className="md:hidden p-2 rounded-full border border-border text-text-secondary hover:text-text-primary bg-background-elevated"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-4 h-4 text-brand-primary" />
          ) : (
            <Sun className="w-4 h-4 text-financial-warning" />
          )}
        </button>

        {rightAction}
      </div>
    </header>
  );
};
