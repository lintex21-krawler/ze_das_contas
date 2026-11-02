import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTheme } from '@/app/providers/ThemeProvider';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { Palette, Globe2, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { currentFamily } = useAuth();

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <PageHeader title="Configurações Gerais" subtitle="Preferências do aplicativo e da família" />
      <section className="p-5 rounded-card bg-background-card border border-border flex flex-col gap-4">
        <h2 className="text-base font-bold text-text-primary flex gap-2 items-center"><Palette className="w-5 h-5 text-brand-primary" />Tema</h2>
        <div className="grid grid-cols-3 gap-2">
          {([['dark', 'Escuro'], ['light', 'Claro'], ['system', 'Sistema']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setTheme(value)} className={`min-h-touch rounded-xl border text-sm font-semibold ${theme === value ? 'bg-brand-primary text-white border-brand-primary' : 'bg-background-elevated border-border text-text-secondary'}`}>{label}</button>
          ))}
        </div>
      </section>
      <section className="p-5 rounded-card bg-background-card border border-border flex flex-col gap-3">
        <h2 className="text-base font-bold text-text-primary flex gap-2 items-center"><Globe2 className="w-5 h-5 text-brand-primary" />Dados da família</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="block text-xs text-text-secondary">Moeda</span><strong>BRL (R$)</strong></div>
          <div><span className="block text-xs text-text-secondary">Fuso horário</span><strong>{currentFamily?.timezone || 'America/Sao_Paulo'}</strong></div>
        </div>
        <p className="text-xs text-text-secondary">A alteração de moeda e fuso horário requer uma atualização administrativa no Supabase. Esta preferência será editável no app em uma próxima versão.</p>
      </section>
      <section className="p-5 rounded-card bg-background-card border border-border flex gap-3">
        <ShieldCheck className="w-5 h-5 text-financial-income shrink-0" />
        <p className="text-sm text-text-secondary">Seus lançamentos são gravados primeiro neste aparelho e sincronizados quando houver conexão.</p>
      </section>
    </div>
  );
};
