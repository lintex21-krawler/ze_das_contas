import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  BarChart3,
  CreditCard,
  Wallet,
  ShoppingCart,
  Repeat,
  Users,
  Settings,
  Moon,
  Sun,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { cn } from '@/shared/utils/cn';

interface SidebarItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

const menuItems: SidebarItem[] = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/lancar', label: 'Novo Lançamento', icon: PlusCircle, highlight: true },
  { to: '/analises', label: 'Análises & Metas', icon: BarChart3 },
  { to: '/cartoes', label: 'Cartões & Faturas', icon: CreditCard },
  { to: '/contas', label: 'Contas Bancárias', icon: Wallet },
  { to: '/listas', label: 'Listas de Compras', icon: ShoppingCart },
  { to: '/recorrencias', label: 'Recorrências', icon: Repeat },
  { to: '/familia', label: 'Membros da Família', icon: Users },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const SidebarNavigation: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { profile, currentFamily, signOut } = useAuth();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside
      aria-label="Navegação desktop"
      className="hidden md:flex flex-col w-64 border-r border-border bg-background-card shrink-0 min-h-screen p-4 justify-between"
    >
      <div className="flex flex-col gap-5">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-bold text-xl shadow-inner">
            Z
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-text-primary tracking-tight leading-none">
              Zé das Contas
            </h1>
            <span className="text-xs text-text-secondary mt-1 flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-financial-income shrink-0" />
              <span className="truncate max-w-[140px]">
                {currentFamily ? currentFamily.name : 'Ambiente Familiar'}
              </span>
            </span>
          </div>
        </div>

        {/* Links */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors select-none min-h-touch',
                    isActive
                      ? 'bg-brand-primary/15 text-brand-primary font-semibold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-elevated',
                    item.highlight &&
                      !isActive &&
                      'text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20'
                  )
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer controls: Perfil, Theme toggle e Logout */}
      <div className="pt-4 border-t border-border flex flex-col gap-2">
        {profile && (
          <div className="flex items-center justify-between px-2 py-1 text-xs">
            <div className="flex flex-col">
              <span className="font-semibold text-text-primary truncate max-w-[140px]">
                {profile.display_name}
              </span>
              <span className="text-[10px] text-text-secondary uppercase">
                {currentFamily?.role === 'admin' ? 'Administrador' : 'Membro'}
              </span>
            </div>
            <button
              onClick={() => signOut()}
              title="Encerrar sessão"
              className="p-1.5 rounded-lg text-text-secondary hover:text-financial-expense hover:bg-financial-expense/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema claro e escuro"
          className="flex items-center justify-between w-full px-3 py-2 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background-elevated transition-colors"
        >
          <span className="flex items-center gap-2">
            {resolvedTheme === 'dark' ? (
              <Moon className="w-4 h-4 text-brand-primary" />
            ) : (
              <Sun className="w-4 h-4 text-financial-warning" />
            )}
            <span>Tema: {theme === 'system' ? 'Sistema' : resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}</span>
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Mudar
          </span>
        </button>
      </div>
    </aside>
  );
};
