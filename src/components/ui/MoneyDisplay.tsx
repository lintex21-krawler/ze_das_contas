import React from 'react';
import { formatBRL, MoneyCents } from '@/domain/money/money';
import { cn } from '@/shared/utils/cn';

export interface MoneyDisplayProps {
  cents: MoneyCents;
  type?: 'neutral' | 'income' | 'expense' | 'auto';
  size?: 'sm' | 'md' | 'lg' | 'display';
  showPositiveSign?: boolean;
  masked?: boolean;
  className?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  cents,
  type = 'auto',
  size = 'md',
  showPositiveSign = false,
  masked = false,
  className,
}) => {
  if (masked) {
    return <span className={cn('tabular-nums font-semibold tracking-wider', className)}>••••••</span>;
  }

  const isIncome = type === 'income' || (type === 'auto' && cents > 0);
  const isExpense = type === 'expense' || (type === 'auto' && cents < 0);

  const colorClass = isIncome
    ? 'text-financial-income'
    : isExpense
    ? 'text-financial-expense'
    : 'text-text-primary';

  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-xl font-bold',
    display: 'text-2xl sm:text-3xl font-bold tracking-tight',
  };

  const formatted = formatBRL(cents, { showPositiveSign: showPositiveSign && isIncome });

  return (
    <span
      className={cn('tabular-nums inline-block', colorClass, sizeClasses[size], className)}
    >
      {formatted}
    </span>
  );
};
