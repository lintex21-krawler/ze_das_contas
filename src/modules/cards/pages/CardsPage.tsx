import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/feedback/EmptyState';
import { CreditCard, Plus } from 'lucide-react';

export const CardsPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cartões de Crédito"
        subtitle="Gerencie faturas, datas de fechamento e limites"
        rightAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Novo Cartão
          </Button>
        }
      />

      <EmptyState
        icon={<CreditCard className="w-8 h-8" />}
        title="Nenhum cartão cadastrado"
        description="Cadastre seus cartões de crédito para calcular faturas, acompanhar parcelamentos e saber o limite disponível em tempo real."
        actionLabel="Adicionar Primeiro Cartão"
        onAction={() => alert('Cadastro de cartões será conectado ao Supabase na Fase 4.')}
      />
    </div>
  );
};
