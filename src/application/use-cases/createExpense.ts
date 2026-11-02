import { db } from '@/infrastructure/local/db';
import {
  LocalTransaction,
  LocalInstallmentPlan,
  LocalInstallment,
  LocalInvoice,
  LocalAccountMovement,
} from '@/infrastructure/local/types';
import { MoneyCents, splitAmountIntoInstallments } from '@/domain/money/money';
import { resolveInvoiceCycle } from '@/domain/cards/invoiceCycle';
import { syncEngine } from '@/infrastructure/sync/sync-engine';
import { addMonths, parseISO, format } from 'date-fns';

export interface CreateExpenseInput {
  familyId: string;
  userId: string;
  description: string;
  amountCents: MoneyCents;
  transactionDate: string; // 'YYYY-MM-DD'
  categoryId?: string | null;
  paymentMethod: 'cash' | 'pix' | 'debit' | 'credit' | 'other';
  accountId?: string | null;
  cardId?: string | null;
  installmentCount?: number;
  notes?: string | null;
}

export async function createExpense(input: CreateExpenseInput): Promise<string> {
  const {
    familyId,
    userId,
    description,
    amountCents,
    transactionDate,
    categoryId = null,
    paymentMethod,
    accountId = null,
    cardId = null,
    installmentCount = 1,
    notes = null,
  } = input;

  if (amountCents <= 0) {
    throw new Error('O valor da despesa deve ser positivo.');
  }

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Caso 1: Pagamento no Crédito (com 1 ou mais parcelas)
  if (paymentMethod === 'credit') {
    if (!cardId) {
      throw new Error('Informe o cartão de crédito utilizado.');
    }

    const card = await db.cards.get(cardId);
    if (!card) {
      throw new Error('Cartão de crédito não encontrado.');
    }

    const count = Math.max(1, installmentCount);
    const installmentAmounts = splitAmountIntoInstallments(amountCents, count);

    // 1. Cria a transação principal
    const transaction: LocalTransaction = {
      id: transactionId,
      familyId,
      transactionType: 'expense',
      description,
      amountCents,
      transactionDate,
      competenceMonth: null, // Será preenchido nas parcelas
      cashDate: null,
      categoryId,
      paymentMethod: 'credit',
      accountId: null,
      cardId,
      status: 'settled',
      notes,
      shoppingListId: null,
      createdBy: userId,
      updatedBy: userId,
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };

    // 2. Cria o plano de parcelamento
    const planId = crypto.randomUUID();
    const plan: LocalInstallmentPlan = {
      id: planId,
      familyId,
      originalTransactionId: transactionId,
      totalAmountCents: amountCents,
      installmentCount: count,
      cardId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
      syncStatus: 'pending',
    };

    // 3. Cria as parcelas e garante a existência das faturas de destino
    const baseTxDate = parseISO(transactionDate);
    const installmentsToSave: LocalInstallment[] = [];
    const invoicesToSave: LocalInvoice[] = [];

    for (let i = 0; i < count; i++) {
      // Cada parcela cai em um ciclo de fatura subsequente
      const targetDate = addMonths(baseTxDate, i);
      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      const cycle = resolveInvoiceCycle(
        targetDateStr,
        card.closingDay,
        card.dueDay,
        card.closingDayPolicy
      );

      // Busca se já existe fatura local para este ciclo
      let invoice = await db.invoices
        .where(['cardId', 'cycleStart'])
        .equals([cardId, cycle.cycleStart])
        .first();

      if (!invoice) {
        // Verifica se já criamos nesta mesma iteração
        invoice = invoicesToSave.find((inv) => inv.cardId === cardId && inv.cycleStart === cycle.cycleStart);
      }

      if (!invoice) {
        invoice = {
          id: crypto.randomUUID(),
          familyId,
          cardId,
          cycleStart: cycle.cycleStart,
          closingDate: cycle.closingDate,
          dueDate: cycle.dueDate,
          referenceMonth: cycle.referenceMonth,
          status: 'open',
          paidAmountCents: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          version: 1,
          syncStatus: 'pending',
        };
        invoicesToSave.push(invoice);
      }

      const installmentId = crypto.randomUUID();
      const instAmount = installmentAmounts[i] ?? Math.floor(amountCents / count);

      installmentsToSave.push({
        id: installmentId,
        familyId,
        planId,
        invoiceId: invoice.id,
        installmentNumber: i + 1,
        amountCents: instAmount,
        dueDate: cycle.dueDate,
        competenceMonth: cycle.referenceMonth,
        status: 'settled',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        version: 1,
        syncStatus: 'pending',
      });
    }

    // Persiste todas as entidades no Dexie e enfileira no outbox
    await db.executeLocalMutation(db.transactions, 'transactions', transaction, 'insert');
    await db.executeLocalMutation(db.installmentPlans, 'installment_plans', plan, 'insert');

    for (const inv of invoicesToSave) {
      await db.executeLocalMutation(db.invoices, 'invoices', inv, 'insert');
    }

    for (const inst of installmentsToSave) {
      await db.executeLocalMutation(db.installments, 'installments', inst, 'insert');
    }

    // Dispara sincronização em segundo plano se online
    syncEngine.syncNow().catch(() => {});
    return transactionId;
  }

  // Caso 2: Pagamento à Vista (Dinheiro, PIX, Débito)
  if (!accountId) {
    throw new Error('Informe a conta de origem para pagamentos em dinheiro, PIX ou débito.');
  }

  const transaction: LocalTransaction = {
    id: transactionId,
    familyId,
    transactionType: 'expense',
    description,
    amountCents,
    transactionDate,
    competenceMonth: format(parseISO(transactionDate), 'yyyy-MM-01'),
    cashDate: transactionDate,
    categoryId,
    paymentMethod,
    accountId,
    cardId: null,
    status: 'settled',
    notes,
    shoppingListId: null,
    createdBy: userId,
    updatedBy: userId,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  // Movimentação de caixa imediata (reduz o saldo da conta na data efetiva)
  const movementId = crypto.randomUUID();
  const movement: LocalAccountMovement = {
    id: movementId,
    familyId,
    accountId,
    movementType: 'expense',
    amountCents,
    effectiveDate: transactionDate,
    sourceEntity: 'transactions',
    sourceId: transactionId,
    operationId: transactionId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
    syncStatus: 'pending',
  };

  await db.executeLocalMutation(db.transactions, 'transactions', transaction, 'insert');
  await db.accountMovements.put(movement);

  syncEngine.syncNow().catch(() => {});
  return transactionId;
}
