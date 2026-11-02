import { db } from '@/infrastructure/local/db';
import { LocalInvoicePayment, LocalAccountMovement } from '@/infrastructure/local/types';
import { MoneyCents, addMoney } from '@/domain/money/money';
import { syncEngine } from '@/infrastructure/sync/sync-engine';

export interface PayInvoiceInput {
  familyId: string;
  userId: string;
  invoiceId: string;
  accountId: string;
  amountCents: MoneyCents;
  paidAt: string; // ISO string
}

export async function payInvoice(input: PayInvoiceInput): Promise<string> {
  const { familyId, userId, invoiceId, accountId, amountCents, paidAt } = input;

  if (amountCents <= 0) {
    throw new Error('O valor do pagamento de fatura deve ser positivo.');
  }

  const invoice = await db.invoices.get(invoiceId);
  if (!invoice) {
    throw new Error('Fatura não encontrada.');
  }

  const paymentId = crypto.randomUUID();
  const operationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const effectiveDate = paidAt.slice(0, 10);

  // 1. Registra o pagamento da fatura
  const payment: LocalInvoicePayment = {
    id: paymentId,
    familyId,
    invoiceId,
    accountId,
    amountCents,
    paidAt,
    createdBy: userId,
    operationId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  // 2. Registra saída de caixa na conta bancária (reduz saldo da conta)
  // Regra fundamental: NÃO gera despesa nova de consumo!
  const movement: LocalAccountMovement = {
    id: crypto.randomUUID(),
    familyId,
    accountId,
    movementType: 'invoice_payment',
    amountCents,
    effectiveDate,
    sourceEntity: 'invoice_payments',
    sourceId: paymentId,
    operationId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  // 3. Atualiza valor pago e status da fatura
  const newPaidAmount = addMoney(invoice.paidAmountCents, amountCents);

  // Calcula total das parcelas desta fatura
  const installments = await db.installments.where('invoiceId').equals(invoiceId).toArray();
  const totalInvoiceCents = installments.reduce((acc, inst) => acc + inst.amountCents, 0);

  const newStatus = newPaidAmount >= totalInvoiceCents && totalInvoiceCents > 0 ? 'paid' : 'partially_paid';

  await db.executeLocalMutation(db.invoicePayments, 'invoice_payments', payment, 'insert');
  await db.accountMovements.put(movement);
  await db.invoices.update(invoiceId, {
    paidAmountCents: newPaidAmount,
    status: newStatus,
    updatedAt: now,
    syncStatus: 'pending',
  });

  syncEngine.syncNow().catch(() => {});
  return paymentId;
}
