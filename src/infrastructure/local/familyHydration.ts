import { db } from './db';
import { supabase } from '@/infrastructure/supabase/client';

/**
 * Reconstitui o espelho local a partir do Supabase. O IndexedDB é um cache
 * offline, nunca a fonte definitiva dos dados da família.
 */
const TABLES = [
  { remote: 'accounts', local: 'accounts', softDelete: true },
  { remote: 'cards', local: 'cards', softDelete: true },
  { remote: 'categories', local: 'categories', softDelete: true },
  { remote: 'transactions', local: 'transactions', softDelete: true },
  { remote: 'installment_plans', local: 'installmentPlans', softDelete: false },
  { remote: 'invoices', local: 'invoices', softDelete: false },
  { remote: 'installments', local: 'installments', softDelete: false },
  { remote: 'invoice_payments', local: 'invoicePayments', softDelete: false },
  { remote: 'account_movements', local: 'accountMovements', softDelete: false },
  // Estas tabelas foram adicionadas em migration posterior; aqui não há
  // coluna deleted_at no schema original — carregadas sem filtro.
  { remote: 'transfers', local: 'transfers', softDelete: false },
  // Estas tabelas ainda não têm deleted_at no schema original. Elas são
  // carregadas integralmente para não interromper a restauração da família.
  { remote: 'budgets', local: 'budgets', softDelete: true },
  { remote: 'financial_goals', local: 'financialGoals', softDelete: true },
  { remote: 'shopping_lists', local: 'shoppingLists', softDelete: true },
  { remote: 'shopping_items', local: 'shoppingItems', softDelete: true },
] as const;

function toLocalEntity(row: Record<string, unknown>) {
  const local: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    local[key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())] = value;
  }

  // Entidades legadas não possuem estes campos no PostgreSQL, mas o modelo
  // local os exige para que consultas e UI funcionem de modo uniforme.
  local.deletedAt ??= null;
  local.version ??= 1;
  local.updatedAt ??= local.createdAt ?? new Date().toISOString();
  local.syncStatus = 'synced';
  return local;
}

export async function hydrateFamilyData(familyId: string): Promise<void> {
  // Processa cada tabela de forma independente. Se uma falhar (ex.: coluna
  // ainda não existe no schema), as demais ainda são restauradas.
  const errors: string[] = [];

  for (const config of TABLES) {
    try {
      let query = supabase.from(config.remote).select('*').eq('family_id', familyId);
      if (config.softDelete) query = query.is('deleted_at', null);

      const { data, error } = await query;
      if (error) {
        errors.push(`${config.remote}: ${error.message}`);
        continue;
      }
      if (!data?.length) continue;

      const table = db[config.local] as any;

      // Para tabelas sem soft-delete remoto, não sobrescreve registros que
      // já foram excluídos localmente e ainda aguardam sync com o Supabase.
      if (!config.softDelete) {
        const localDeletedIds = new Set(
          (await table.where('familyId').equals(familyId).filter((e: any) => !!e.deletedAt).keys())
        );
        const rows = data
          .map((row) => toLocalEntity(row as Record<string, unknown>))
          .filter((entity) => !localDeletedIds.has(entity.id as string));
        if (rows.length > 0) await table.bulkPut(rows);
      } else {
        await table.bulkPut(data.map((row) => toLocalEntity(row as Record<string, unknown>)));
      }
    } catch (err: any) {
      errors.push(`${config.remote}: ${err.message ?? 'erro inesperado'}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Hidratação parcial — algumas tabelas falharam:', errors.join('; '));
  }
}
