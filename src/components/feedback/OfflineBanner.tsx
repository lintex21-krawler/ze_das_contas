import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

export const OfflineBanner: React.FC<{ className?: string }> = ({ className }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full bg-financial-warning/15 border-b border-financial-warning/30 px-4 py-2 text-financial-warning text-xs sm:text-sm font-medium flex items-center justify-center gap-2 select-none safe-top',
        className
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo offline ativo. Seus lançamentos são salvos com segurança neste aparelho.</span>
    </div>
  );
};
