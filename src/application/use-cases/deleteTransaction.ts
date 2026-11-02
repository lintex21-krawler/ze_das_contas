import { db } from '@/infrastructure/local/db';
import { LocalTransaction } from '@/infrastructure/local/types';
import { softDeleteFinancialEntity } from './softDeleteFinancialEntity';

/** Exclui um lançamento e os efeitos financeiros diretamente criados por ele. */
export async function deleteTransaction(transaction: LocalTransaction): Promise<void> {
  await softDeleteFinancialEntity(db.transactions, 'transactions', transaction);

  const movements = await db.accountMovements
    .where('familyId')
    .equals(transaction.familyId)
    .filter((movement) => !movement.deletedAt && movement.sourceId === transaction.id)
    .toArray();
  for (const movement of movements) {
    await softDeleteFinancialEntity(db.accountMovements, 'account_movements', movement);
  }

  // Uma compra no crédito é representada por plano + parcelas. Eles também
  // devem deixar de participar dos relatórios e limites após a exclusão.
  const plans = await db.installmentPlans
    .where('familyId')
    .equals(transaction.familyId)
    .filter((plan) => !plan.deletedAt && plan.originalTransactionId === transaction.id)
    .toArray();
  for (const plan of plans) {
    const installments = await db.installments
      .where('planId')
      .equals(plan.id)
      .filter((installment) => !installment.deletedAt)
      .toArray();
    for (const installment of installments) {
      await softDeleteFinancialEntity(db.installments, 'installments', installment);
    }
    await softDeleteFinancialEntity(db.installmentPlans, 'installment_plans', plan);
  }
}
