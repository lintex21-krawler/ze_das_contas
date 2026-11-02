import { describe, it, expect } from 'vitest';
import { calculateMonthReport } from './perspectivesCalculator';
import { calculateCategoryBreakdown } from './categoryAnalytics';
import { evaluateBudget } from './budgetAnalytics';
import { LocalTransaction, LocalInstallment, LocalAccountMovement, LocalBudget, LocalCategory } from '@/infrastructure/local/types';

describe('Domain: Analytics & Perspectives Engine', () => {
  const referenceMonth = '2026-11-01';

  it('deve calcular corretamente a perspectiva de Competência vs Caixa', () => {
    // 1. Despesa no débito de R$ 100,00 dia 05/11
    const txDebit: LocalTransaction = {
      id: 'tx-1',
      familyId: 'fam-1',
      transactionType: 'expense',
      description: 'Supermercado',
      amountCents: 10000,
      transactionDate: '2026-11-05',
      competenceMonth: '2026-11-01',
      cashDate: '2026-11-05',
      categoryId: 'cat-mercado',
      paymentMethod: 'debit',
      accountId: 'acc-1',
      cardId: null,
      status: 'settled',
      notes: null,
      shoppingListId: null,
      createdBy: 'u-1',
      updatedBy: 'u-1',
      source: 'manual',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    // 2. Parcela no crédito de R$ 150,00 com competência na fatura de novembro
    const instCredit: LocalInstallment = {
      id: 'inst-1',
      familyId: 'fam-1',
      planId: 'plan-1',
      invoiceId: 'inv-1',
      installmentNumber: 1,
      amountCents: 15000,
      dueDate: '2026-11-27',
      competenceMonth: '2026-11-01',
      status: 'settled',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    // 3. Receita recebida de R$ 500,00 dia 10/11
    const txIncome: LocalTransaction = {
      id: 'tx-2',
      familyId: 'fam-1',
      transactionType: 'income',
      description: 'Salário',
      amountCents: 50000,
      transactionDate: '2026-11-10',
      competenceMonth: '2026-11-01',
      cashDate: '2026-11-10',
      categoryId: null,
      paymentMethod: null,
      accountId: 'acc-1',
      cardId: null,
      status: 'settled',
      notes: null,
      shoppingListId: null,
      createdBy: 'u-1',
      updatedBy: 'u-1',
      source: 'manual',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    // Movimentações bancárias correspondentes
    const movements: LocalAccountMovement[] = [
      {
        id: 'mov-1',
        familyId: 'fam-1',
        accountId: 'acc-1',
        movementType: 'expense',
        amountCents: 10000,
        effectiveDate: '2026-11-05',
        sourceEntity: 'transactions',
        sourceId: 'tx-1',
        operationId: 'op-1',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        version: 1,
        syncStatus: 'synced',
      },
      {
        id: 'mov-2',
        familyId: 'fam-1',
        accountId: 'acc-1',
        movementType: 'income',
        amountCents: 50000,
        effectiveDate: '2026-11-10',
        sourceEntity: 'transactions',
        sourceId: 'tx-2',
        operationId: 'op-2',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        version: 1,
        syncStatus: 'synced',
      },
      // Suponha que a fatura foi paga no dia 27:
      {
        id: 'mov-3',
        familyId: 'fam-1',
        accountId: 'acc-1',
        movementType: 'invoice_payment',
        amountCents: 15000,
        effectiveDate: '2026-11-27',
        sourceEntity: 'invoice_payments',
        sourceId: 'pay-1',
        operationId: 'op-3',
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        version: 1,
        syncStatus: 'synced',
      },
    ];

    // Cálculo por Competência:
    // Receitas: R$ 500,00 | Despesas: R$ 100,00 (débito) + R$ 150,00 (crédito) = R$ 250,00
    const competenceReport = calculateMonthReport(
      referenceMonth,
      'competence',
      [txDebit, txIncome],
      [instCredit],
      movements,
      []
    );
    expect(competenceReport.totalIncomeCents).toBe(50000);
    expect(competenceReport.totalExpenseCents).toBe(25000);
    expect(competenceReport.netResultCents).toBe(25000); // R$ 250,00 poupado

    // Cálculo por Caixa:
    // Entradas: R$ 500,00 | Saídas: R$ 100,00 (débito) + R$ 150,00 (pagamento fatura) = R$ 250,00
    const cashReport = calculateMonthReport(
      referenceMonth,
      'cash',
      [txDebit, txIncome],
      [instCredit],
      movements,
      []
    );
    expect(cashReport.totalIncomeCents).toBe(50000);
    expect(cashReport.totalExpenseCents).toBe(25000);
    expect(cashReport.netResultCents).toBe(25000);
  });

  it('deve usar data da compra para despesa à vista e competência da fatura para crédito', () => {
    const debitExpense = {
      id: 'tx-oct-debit', familyId: 'fam-1', transactionType: 'expense' as const,
      description: 'Compra no débito em outubro', amountCents: 10000,
      transactionDate: '2026-10-25', competenceMonth: '2026-10-01', cashDate: '2026-10-25',
      categoryId: null, paymentMethod: 'debit' as const, accountId: 'acc-1', cardId: null,
      status: 'settled' as const, notes: null, shoppingListId: null, createdBy: 'u-1', updatedBy: 'u-1',
      source: 'manual' as const, createdAt: '', updatedAt: '', deletedAt: null, version: 1, syncStatus: 'synced' as const,
    };
    const octoberDebitReport = calculateMonthReport('2026-11-01', 'competence', [debitExpense], [], [], []);
    expect(octoberDebitReport.totalExpenseCents).toBe(0);

    const novemberCreditInstallment: LocalInstallment = {
      id: 'inst-credit-nov', familyId: 'fam-1', planId: 'plan-1', invoiceId: 'inv-1',
      installmentNumber: 1, amountCents: 20000, dueDate: '2026-11-27', competenceMonth: '2026-11-01',
      status: 'settled', createdAt: '', updatedAt: '', deletedAt: null, version: 1, syncStatus: 'synced',
    };
    const novemberCreditReport = calculateMonthReport('2026-11-01', 'competence', [debitExpense], [novemberCreditInstallment], [], []);
    expect(novemberCreditReport.totalExpenseCents).toBe(20000);
  });

  it('deve avaliar status de orçamentos e mensagens acolhedoras nas faixas corretas', () => {
    const budget: LocalBudget = {
      id: 'b-1',
      familyId: 'fam-1',
      categoryId: 'cat-delivery',
      referenceMonth: '2026-11-01',
      limitCents: 20000, // R$ 200,00
      perspective: 'competence',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    // 50% de uso -> Normal
    const evalNormal = evaluateBudget(budget, 10000, 'Delivery');
    expect(evalNormal.status).toBe('normal');

    // 75% de uso -> Warning (atenção 70%)
    const evalWarning = evaluateBudget(budget, 15000, 'Delivery');
    expect(evalWarning.status).toBe('warning');
    expect(evalWarning.feedbackMessage).toContain('75% do orçamento');

    // 92% de uso -> Alert (alerta 90%)
    const evalAlert = evaluateBudget(budget, 18400, 'Delivery');
    expect(evalAlert.status).toBe('alert');
    expect(evalAlert.feedbackMessage).toContain('próximo do limite');

    // 105% de uso -> Exceeded
    const evalExceeded = evaluateBudget(budget, 21000, 'Delivery');
    expect(evalExceeded.status).toBe('exceeded');
    expect(evalExceeded.feedbackMessage).toContain('atingiu 100%');
  });

  it('deve agrupar despesas por categoria com percentuais e ordenação decrescente', () => {
    const categories: LocalCategory[] = [
      {
        id: 'cat-mercado',
        familyId: 'fam-1',
        name: 'Supermercado',
        transactionType: 'expense',
        parentId: null,
        color: '#10B981',
        icon: 'ShoppingCart',
        essentiality: 'essential',
        isSystemDefault: true,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        version: 1,
        syncStatus: 'synced',
      },
      {
        id: 'cat-lazer',
        familyId: 'fam-1',
        name: 'Lazer & Restaurantes',
        transactionType: 'expense',
        parentId: null,
        color: '#F59E0B',
        icon: 'Coffee',
        essentiality: 'non_essential',
        isSystemDefault: true,
        isActive: true,
        createdAt: '',
        updatedAt: '',
        deletedAt: null,
        version: 1,
        syncStatus: 'synced',
      },
    ];

    const tx1: LocalTransaction = {
      id: 'tx-1',
      familyId: 'fam-1',
      transactionType: 'expense',
      description: 'Compras mês',
      amountCents: 60000, // R$ 600,00 (60%)
      transactionDate: '2026-11-02',
      competenceMonth: '2026-11-01',
      cashDate: '2026-11-02',
      categoryId: 'cat-mercado',
      paymentMethod: 'debit',
      accountId: 'acc-1',
      cardId: null,
      status: 'settled',
      notes: null,
      shoppingListId: null,
      createdBy: 'u-1',
      updatedBy: 'u-1',
      source: 'manual',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    const tx2: LocalTransaction = {
      id: 'tx-2',
      familyId: 'fam-1',
      transactionType: 'expense',
      description: 'Jantar',
      amountCents: 40000, // R$ 400,00 (40%)
      transactionDate: '2026-11-15',
      competenceMonth: '2026-11-01',
      cashDate: '2026-11-15',
      categoryId: 'cat-lazer',
      paymentMethod: 'pix',
      accountId: 'acc-1',
      cardId: null,
      status: 'settled',
      notes: null,
      shoppingListId: null,
      createdBy: 'u-1',
      updatedBy: 'u-1',
      source: 'manual',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
      version: 1,
      syncStatus: 'synced',
    };

    const breakdown = calculateCategoryBreakdown('2026-11-01', [tx1, tx2], [], categories);
    expect(breakdown).toHaveLength(2);
    // Maior despesa primeiro
    expect(breakdown[0]?.categoryId).toBe('cat-mercado');
    expect(breakdown[0]?.totalCents).toBe(60000);
    expect(breakdown[0]?.percentage).toBe(60);

    expect(breakdown[1]?.categoryId).toBe('cat-lazer');
    expect(breakdown[1]?.totalCents).toBe(40000);
    expect(breakdown[1]?.percentage).toBe(40);
  });
});
