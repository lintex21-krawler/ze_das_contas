import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Plus, BarChart3, CreditCard, Menu } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isAction?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/analises', label: 'Análises', icon: BarChart3 },
  { to: '/lancar', label: 'Lançar', icon: Plus, isAction: true },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/mais', label: 'Mais', icon: Menu },
];

export const BottomNavigation: React.FC = () => {
  return (
    <nav
      aria-label="Navegação mobile principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background-card/95 backdrop-blur-md border-t border-border safe-bottom shadow-lg"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'relative -top-3 flex flex-col items-center justify-center w-12 h-12 rounded-full shadow-lg transition-transform active:scale-95',
                    isActive
                      ? 'bg-brand-primary text-white ring-4 ring-brand-primary/25'
                      : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                  )
                }
                aria-label="Lançar transação rápida"
              >
                <Icon className="w-6 h-6 stroke-[2.5]" />
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center w-14 h-full min-h-touch gap-1 text-[11px] font-medium transition-colors select-none',
                  isActive
                    ? 'text-brand-primary font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-5 h-5 transition-transform',
                      isActive ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'
                    )}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
