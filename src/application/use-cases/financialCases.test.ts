import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/infrastructure/local/db';
import { createExpense } from './createExpense';
import { createIncome } from './createIncome';
import { createTransfer } from './createTransfer';
import { payInvoice } from './payInvoice';
import { calculateAccountBalance, calculateConsolidatedBalance } from '@/domain/finance/balanceCalculator';
import { splitAmountIntoInstallments } from '@/domain/money/money';
import { LocalAccount, LocalCard } from '@/infrastructure/local/types';

describe('Casos Financeiros Obrigatórios de Referência', () => {
  const familyId = 'fam-test-123';
  const userId = 'usr-test-123';

  beforeEach(async () => {
    await db.accounts.clear();
    await db.cards.clear();
    await db.categories.clear();
    await db.transactions.clear();
    await db.installmentPlans.clear();
    await db.invoices.clear();
    await db.installments.clear();
    await db.invoicePayments.clear();
    await db.transfers.clear();
    await db.accountMovements.clear();
    await db.outbox.clear();

    // Cria conta corrente padrão com R$ 1.000,00 (100000 centavos)
    const account: LocalAccount = {
      id: 'acc-1',
      familyId,
      name: 'Conta Corrente',
      accountType: 'checking',
      institution: 'Banco do Brasil',
      initialBalanceCents: 100000,
      balanceAsOf: '2026-11-01',
      color: '#000',
      icon: 'Wallet',
      isActive: true,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };
    await db.accounts.add(account);

    // Cria cartão de crédito padrão (Limite R$ 2.000,00, fecha dia 20, vence dia 27)
    const card: LocalCard = {
      id: 'card-1',
      familyId,
      accountId: 'acc-1',
      name: 'Cartão Nubank',
      institution: 'Nubank',
      creditLimitCents: 200000,
      closingDay: 20,
      dueDay: 27,
      closingDayPolicy: 'include_closing_day',
      color: '#820AD1',
      isActive: true,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };
    await db.cards.add(card);
  });

  it('Caso 1: Compra de R$ 100,00 em 3 parcelas soma exatamente R$ 100,00', () => {
    const installments = splitAmountIntoInstallments(10000, 3);
    expect(installments).toEqual([3334, 3333, 3333]);
    expect(installments.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it('Caso 2: Compra de R$ 10,00 em 3 parcelas resulta em R$ 3,34 + R$ 3,33 + R$ 3,33', () => {
    const installments = splitAmountIntoInstallments(1000, 3);
    expect(installments).toEqual([334, 333, 333]);
    expect(installments.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('Caso 3: Transferência de R$ 500 entre contas não altera total consolidado de receitas e despesas', async () => {
    // Cria segunda conta com saldo inicial 0
    const account2: LocalAccount = {
      id: 'acc-2',
      familyId,
      name: 'Poupança',
      accountType: 'savings',
      institution: 'Itaú',
      initialBalanceCents: 0,
      balanceAsOf: '2026-11-01',
      color: '#FF6600',
      icon: 'PiggyBank',
      isActive: true,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };
    await db.accounts.add(account2);

    const initialConsolidated = calculateConsolidatedBalance(
      [await db.accounts.get('acc-1') as LocalAccount, account2],
      await db.accountMovements.toArray()
    );
    expect(initialConsolidated).toBe(100000); // R$ 1.000,00

    // Executa transferência de R$ 500,00 (50000 centavos) de acc-1 para acc-2
    await createTransfer({
      familyId,
      userId,
      originAccountId: 'acc-1',
      destinationAccountId: 'acc-2',
      amountCents: 50000,
      transferDate: '2026-11-02',
      description: 'Reserva para poupança',
    });

    const movements = await db.accountMovements.toArray();
    const finalConsolidated = calculateConsolidatedBalance(
      [await db.accounts.get('acc-1') as LocalAccount, await db.accounts.get('acc-2') as LocalAccount],
      movements
    );

    // O saldo consolidado de caixa total permanece inalterado (R$ 1.000,00)
    expect(finalConsolidated).toBe(100000);

    // Saldo individual da conta 1 caiu para R$ 500,00
    const movAcc1 = movements.filter((m) => m.accountId === 'acc-1');
    expect(calculateAccountBalance(100000, movAcc1)).toBe(50000);

    // Saldo individual da conta 2 subiu para R$ 500,00
    const movAcc2 = movements.filter((m) => m.accountId === 'acc-2');
    expect(calculateAccountBalance(0, movAcc2)).toBe(50000);

    // Nenhuma transação de receita ou despesa de consumo foi gerada
    const transactions = await db.transactions.toArray();
    expect(transactions).toHaveLength(0);
  });

  it('Caso 4: Compra no crédito de R$ 200 não reduz o saldo bancário no ato', async () => {
    await createExpense({
      familyId,
      userId,
      description: 'Tênis esportivo',
      amountCents: 20000, // R$ 200,00
      transactionDate: '2026-11-02',
      paymentMethod: 'credit',
      cardId: 'card-1',
      installmentCount: 2,
    });

    const movements = await db.accountMovements.where('accountId').equals('acc-1').toArray();
    const balance = calculateAccountBalance(100000, movements);

    // Saldo bancário continua intacto (R$ 1.000,00)
    expect(balance).toBe(100000);

    // Foram geradas 2 parcelas de R$ 100,00 cada
    const installments = await db.installments.toArray();
    expect(installments).toHaveLength(2);
    expect(installments[0]?.amountCents).toBe(10000);
    expect(installments[1]?.amountCents).toBe(10000);
  });

  it('Caso 5: Pagamento de fatura de R$ 200 reduz caixa e obrigação, sem duplicar despesa', async () => {
    // 1. Gera compra de R$ 200,00 no crédito em 1x
    await createExpense({
      familyId,
      userId,
      description: 'Supermercado Mensal',
      amountCents: 20000,
      transactionDate: '2026-11-02',
      paymentMethod: 'credit',
      cardId: 'card-1',
      installmentCount: 1,
    });

    const invoices = await db.invoices.toArray();
    expect(invoices).toHaveLength(1);
    const invoiceId = invoices[0]?.id as string;

    // 2. Registra o pagamento da fatura usando a conta acc-1
    await payInvoice({
      familyId,
      userId,
      invoiceId,
      accountId: 'acc-1',
      amountCents: 20000,
      paidAt: '2026-11-27T10:00:00Z',
    });

    // A fatura foi marcada como paga
    const updatedInvoice = await db.invoices.get(invoiceId);
    expect(updatedInvoice?.status).toBe('paid');
    expect(updatedInvoice?.paidAmountCents).toBe(20000);

    // O caixa bancário reduziu os R$ 200,00 na data do pagamento
    const movements = await db.accountMovements.where('accountId').equals('acc-1').toArray();
    const balance = calculateAccountBalance(100000, movements);
    expect(balance).toBe(80000); // R$ 800,00

    // O total de despesas de consumo registradas continua sendo APENAS UMA (a compra original)
    const expenses = await db.transactions.where('transactionType').equals('expense').toArray();
    expect(expenses).toHaveLength(1);
  });

  it('Caso 6: Receita prevista de R$ 3.000 não aumenta o saldo real até recebimento', async () => {
    await createIncome({
      familyId,
      userId,
      description: 'Salário do Mês',
      amountCents: 300000, // R$ 3.000,00
      transactionDate: '2026-11-10',
      accountId: 'acc-1',
      status: 'planned', // Prevista
    });

    const movements = await db.accountMovements.where('accountId').equals('acc-1').toArray();
    const balance = calculateAccountBalance(100000, movements);

    // Saldo real NÃO aumenta com receitas previstas
    expect(balance).toBe(100000);

    // Quando convertida para recebida ('settled'), deve gerar a movimentação
    await createIncome({
      familyId,
      userId,
      description: 'Salário Confirmado',
      amountCents: 300000,
      transactionDate: '2026-11-10',
      accountId: 'acc-1',
      status: 'settled',
    });

    const updatedMovements = await db.accountMovements.where('accountId').equals('acc-1').toArray();
    const updatedBalance = calculateAccountBalance(100000, updatedMovements);

    expect(updatedBalance).toBe(400000); // R$ 4.000,00
  });

  it('Caso 8: Dois inserts offline independentes persistem e geram operações separadas no outbox', async () => {
    await createExpense({
      familyId,
      userId,
      description: 'Café da manhã',
      amountCents: 1500, // R$ 15,00
      transactionDate: '2026-11-02',
      paymentMethod: 'cash',
      accountId: 'acc-1',
    });

    await createExpense({
      familyId,
      userId,
      description: 'Farmácia',
      amountCents: 4500, // R$ 45,00
      transactionDate: '2026-11-02',
      paymentMethod: 'debit',
      accountId: 'acc-1',
    });

    const transactions = await db.transactions.toArray();
    expect(transactions).toHaveLength(2);

    const outboxItems = await db.outbox.toArray();
    // 2 transações + 2 movimentos de caixa = 4 operações no outbox
    expect(outboxItems).toHaveLength(4);
    
    // As operações devem ter IDs únicos
    const operationIds = outboxItems.map((item) => item.operationId);
    const uniqueOperationIds = new Set(operationIds);
    expect(uniqueOperationIds.size).toBe(4);
  });
});
