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
  { remote: 'transfers', local: 'transfers', softDelete: false },
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
  for (const config of TABLES) {
    let query = supabase.from(config.remote).select('*').eq('family_id', familyId);
    if (config.softDelete) query = query.is('deleted_at', null);

    const { data, error } = await query;
    if (error) throw new Error(`${config.remote}: ${error.message}`);
    if (!data?.length) continue;

    const table = db[config.local] as any;
    await table.bulkPut(data.map((row) => toLocalEntity(row as Record<string, unknown>)));
  }
}
