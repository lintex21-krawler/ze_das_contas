import React from 'react';
import { formatBRL, parseCurrencyInput, MoneyCents } from '@/domain/money/money';
import { cn } from '@/shared/utils/cn';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: MoneyCents;
  onChange: (cents: MoneyCents) => void;
  label?: string;
  error?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  error,
  className,
  id,
  disabled,
  ...props
}) => {
  const inputId = id || 'currency-input-' + Math.random().toString(36).substring(2, 9);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cents = parseCurrencyInput(raw);
    onChange(cents);
  };

  const formattedDisplay = formatBRL(value);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs sm:text-sm font-medium text-text-secondary select-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={formattedDisplay}
          onChange={handleChange}
          className={cn(
            'w-full px-4 py-3 rounded-input bg-background-elevated border border-border text-text-primary text-xl font-bold tabular-nums',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-financial-expense focus:ring-financial-expense',
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-financial-expense font-medium">{error}</span>}
    </div>
  );
};
