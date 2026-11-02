import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { addMonths, subMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthSelectorProps {
  currentMonth: string; // 'YYYY-MM-01'
  onChange: (newMonth: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ currentMonth, onChange }) => {
  const date = parseISO(currentMonth);

  const handlePrev = () => {
    const prev = subMonths(date, 1);
    onChange(format(prev, 'yyyy-MM-01'));
  };

  const handleNext = () => {
    const next = addMonths(date, 1);
    onChange(format(next, 'yyyy-MM-01'));
  };

  const handleToday = () => {
    const now = new Date();
    onChange(format(now, 'yyyy-MM-01'));
  };

  const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR });
  const capitalizedLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const isCurrentMonth = format(new Date(), 'yyyy-MM-01') === currentMonth;

  return (
    <div className="flex items-center justify-between p-2 rounded-card bg-background-card border border-border">
      <button
        type="button"
        onClick={handlePrev}
        className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors min-h-touch min-w-touch flex items-center justify-center"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm sm:text-base font-bold text-text-primary capitalize">
          {capitalizedLabel}
        </span>
        {!isCurrentMonth && (
          <button
            type="button"
            onClick={handleToday}
            className="text-[11px] font-semibold text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1"
          >
            <Calendar className="w-3 h-3" />
            Hoje
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors min-h-touch min-w-touch flex items-center justify-center"
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};
