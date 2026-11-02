import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  comparison?: string;
  comparisonType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  onClick?: () => void;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  comparison,
  comparisonType = 'neutral',
  subtext,
  onClick,
  className,
}) => {
  const comparisonColor =
    comparisonType === 'positive'
      ? 'text-financial-income'
      : comparisonType === 'negative'
      ? 'text-financial-expense'
      : 'text-text-secondary';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'p-4 rounded-card bg-background-card border border-border transition-all flex flex-col justify-between gap-2 shadow-sm',
        onClick && 'cursor-pointer hover:border-brand-primary/50 active:scale-[0.99]',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-text-secondary line-clamp-1">
          {label}
        </span>
        {icon && (
          <div className="p-2 rounded-xl bg-background-elevated text-brand-primary flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-0.5 my-1">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
          {value}
        </div>
        {comparison && (
          <span className={cn('text-xs font-semibold', comparisonColor)}>
            {comparison}
          </span>
        )}
      </div>

      {subtext && (
        <span className="text-[11px] sm:text-xs text-text-secondary line-clamp-1">
          {subtext}
        </span>
      )}
    </div>
  );
};
