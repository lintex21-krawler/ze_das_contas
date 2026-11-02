import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'danger' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  className,
  children,
  ...props
}) => {
  const variants = {
    brand: 'bg-brand-primary/15 text-brand-primary border-brand-primary/20',
    success: 'bg-financial-income/15 text-financial-income border-financial-income/20',
    danger: 'bg-financial-expense/15 text-financial-expense border-financial-expense/20',
    warning: 'bg-financial-warning/15 text-financial-warning border-financial-warning/20',
    neutral: 'bg-background-elevated text-text-secondary border-border',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
