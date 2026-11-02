import React from 'react';
import { cn } from '@/shared/utils/cn';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'button';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className,
  variant = 'text',
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    card: 'h-24 w-full rounded-card',
    circle: 'w-10 h-10 rounded-full',
    button: 'h-11 w-full rounded-button',
  };

  return (
    <div
      role="status"
      aria-label="Carregando..."
      className={cn(
        'animate-pulse bg-background-elevated/80 border border-border/50',
        variantStyles[variant],
        className
      )}
    />
  );
};
