import { db } from './db';
import { supabase } from '@/infrastructure/supabase/client';
import { LocalCategory } from './types';

/**
 * Carrega no IndexedDB as categorias já existentes no servidor.
 * Categorias padrão são criadas pela RPC de criação da família no Supabase;
 * esta hidratação as disponibiliza imediatamente para formulários offline-first.
 */
export async function hydrateFamilyCategories(familyId: string): Promise<void> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .is('deleted_at', null);

  if (error) throw error;
  if (!data?.length) return;

  const categories: LocalCategory[] = data.map((category: Record<string, any>) => ({
    id: category.id,
    familyId: category.family_id,
    name: category.name,
    parentId: category.parent_id,
    transactionType: category.transaction_type,
    essentiality: category.essentiality ?? 'unset',
    color: category.color,
    icon: category.icon,
    isSystemDefault: category.is_system_default,
    isActive: category.is_active,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
    deletedAt: category.deleted_at,
    version: category.version ?? 1,
    syncStatus: 'synced',
  }));

  await db.categories.bulkPut(categories);
}
