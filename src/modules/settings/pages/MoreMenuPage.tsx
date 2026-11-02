import React, { useState } from 'react';
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
  FileJson,
  FileSpreadsheet,
  Bug,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { exportFamilyData, generateExportFilename, downloadBlob } from '@/application/use-cases/exportFamilyData';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export const MoreMenuPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentFamily } = useAuth();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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
    {
      title: '🔧 Diagnóstico de Sincronização',
      description: 'Logs técnicos, outbox e troubleshooting',
      icon: Bug,
      path: '/sync-debug',
    },
  ];

  const handleExport = async (format: 'json' | 'csv') => {
    if (!currentFamily) {
      alert('Nenhuma família selecionada.');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportFamilyData(currentFamily.id, currentFamily.name, format);
      const filename = generateExportFilename(currentFamily.name, format);
      downloadBlob(blob, filename);
      setIsExportModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar dados.');
    } finally {
      setIsExporting(false);
    }
  };

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
            className="flex items-center gap-1 hover:text-text-primary text-brand-primary transition-colors"
            onClick={() => setIsExportModalOpen(true)}
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Dados
          </button>
        </div>
      </div>

      {/* Modal de Exportação */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-card bg-background-card border border-border p-6 shadow-xl flex flex-col gap-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Exportar Dados</h3>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
                disabled={isExporting}
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-text-secondary">
              Escolha o formato de exportação dos dados da família <strong>{currentFamily?.name}</strong>:
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="p-4 rounded-xl border border-border bg-background-elevated hover:bg-background-card hover:border-brand-primary transition-all text-left flex items-start gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileJson className="w-6 h-6 text-brand-primary shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text-primary">
                    JSON Completo
                  </span>
                  <span className="text-xs text-text-secondary">
                    Exporta todos os dados estruturados: contas, cartões, transações, faturas, orçamentos e listas. Ideal para backup completo.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="p-4 rounded-xl border border-border bg-background-elevated hover:bg-background-card hover:border-brand-primary transition-all text-left flex items-start gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileSpreadsheet className="w-6 h-6 text-financial-income shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-text-primary">
                    CSV para Planilhas
                  </span>
                  <span className="text-xs text-text-secondary">
                    Exporta transações em formato compatível com Excel e Google Sheets. Inclui categoria, valor, data e forma de pagamento.
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex items-start gap-2 text-xs text-text-secondary">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Os arquivos são gerados localmente no seu dispositivo. Nenhum dado é enviado para servidores externos durante a exportação.
                </span>
              </div>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center gap-2 text-sm text-brand-primary">
                <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                <span>Preparando arquivo...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
