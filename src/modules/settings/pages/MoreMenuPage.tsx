import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Wallet,
  ShoppingCart,
  Repeat,
  Users,
  Settings,
  ChevronRight,
  ShieldCheck,
  Download,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export const MoreMenuPage: React.FC = () => {
  const navigate = useNavigate();

  const sections: MenuItem[] = [
    {
      title: 'Contas Bancárias & Carteiras',
      description: 'Saldos iniciais, contas correntes e dinheiro físico',
      icon: Wallet,
      path: '/contas',
    },
    {
      title: 'Categorias',
      description: 'Personalize categorias de receitas e despesas',
      icon: Settings,
      path: '/categorias',
    },
    {
      title: 'Listas de Compras',
      description: 'Checklist sincronizado e comparação de preços estimados',
      icon: ShoppingCart,
      path: '/listas',
    },
    {
      title: 'Recorrências & Assinaturas',
      description: 'Aluguel, internet, salários e contas mensais fixas',
      icon: Repeat,
      path: '/recorrencias',
    },
    {
      title: 'Família & Membros',
      description: 'Gerencie permissões e convide o segundo usuário',
      icon: Users,
      path: '/familia',
    },
    {
      title: 'Configurações Gerais',
      description: 'Fuso horário, moeda, preferências de fechamento e alertas',
      icon: Settings,
      path: '/configuracoes',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mais Opções"
        subtitle="Gerenciamento complementar do Zé das Contas"
      />

      <div className="flex flex-col gap-2">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.title}
              type="button"
              onClick={() => navigate(sec.path)}
              className="flex items-center justify-between p-4 rounded-card bg-background-card border border-border hover:bg-background-elevated transition-colors text-left group min-h-touch"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-background-elevated text-brand-primary group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">
                    {sec.title}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {sec.description}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          );
        })}
      </div>

      {/* Card Informativo do Zé das Contas */}
      <div className="mt-4 p-4 rounded-card border border-border bg-background-elevated/50 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
          <Info className="w-4 h-4 text-brand-primary" />
          <span>Sobre esta instalação PWA</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          O Zé das Contas opera com tecnologia offline-first. Todos os dados digitados são armazenados localmente e sincronizados de forma segura e criptografada com seu banco de dados familiar no Supabase.
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-border/80 text-[11px] text-text-secondary">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-financial-income" />
            Integridade em Centavos Inteiros
          </span>
          <button
            type="button"
            className="flex items-center gap-1 hover:text-text-primary text-brand-primary"
            onClick={() => alert('Exportação de dados será disponibilizada na Fase 6.')}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Dados
          </button>
        </div>
      </div>
    </div>
  );
};
