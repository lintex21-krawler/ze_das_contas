import React from 'react';
import { cn } from '@/shared/utils/cn';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-card border border-border/80 bg-background-card/50 my-4',
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-background-elevated text-brand-primary flex items-center justify-center mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-base sm:text-lg font-bold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-text-secondary max-w-sm mb-5">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
