import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/infrastructure/local/db';
import { createExpense } from './createExpense';
import { LocalAccount, LocalCard } from '@/infrastructure/local/types';

describe('Validação: Competência da Despesa no Crédito', () => {
  const familyId = 'fam-test';
  const userId = 'usr-test';

  beforeEach(async () => {
    await db.accounts.clear();
    await db.cards.clear();
    await db.transactions.clear();
    await db.installmentPlans.clear();
    await db.invoices.clear();
    await db.installments.clear();
    await db.outbox.clear();

    // Cria conta corrente
    const account: LocalAccount = {
      id: 'acc-1',
      familyId,
      name: 'Conta Principal',
      accountType: 'checking',
      institution: 'Nubank',
      initialBalanceCents: 100000,
      balanceAsOf: '2026-10-01',
      color: '#820AD1',
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

    // Cria cartão com fechamento dia 30 e vencimento dia 07
    const card: LocalCard = {
      id: 'card-1',
      familyId,
      accountId: 'acc-1',
      name: 'Cartão Roxo',
      institution: 'Nubank',
      creditLimitCents: 200000,
      closingDay: 30,
      dueDay: 7,
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

  it('Compra dia 02/10 deve ter competência em OUTUBRO (mês da compra), não novembro', async () => {
    // Cenário real do usuário:
    // Compra dia 02/10 com cartão que fecha dia 30 e vence dia 07
    await createExpense({
      familyId,
      userId,
      description: 'Compra de Teste',
      amountCents: 15000, // R$ 150,00
      transactionDate: '2026-10-02',
      paymentMethod: 'credit',
      cardId: 'card-1',
      installmentCount: 1,
    });

    // Valida a parcela criada
    const installments = await db.installments.toArray();
    expect(installments).toHaveLength(1);

    const installment = installments[0];
    expect(installment?.competenceMonth).toBe('2026-10-01'); // MÊS DA COMPRA
    expect(installment?.dueDate).toBe('2026-11-07'); // Vencimento em novembro

    // Valida a fatura de destino
    const invoices = await db.invoices.toArray();
    expect(invoices).toHaveLength(1);

    const invoice = invoices[0];
    expect(invoice?.closingDate).toBe('2026-10-30'); // Fecha em outubro
    expect(invoice?.dueDate).toBe('2026-11-07'); // Vence em novembro
    expect(invoice?.referenceMonth).toBe('2026-11-01'); // Competência da FATURA é novembro (mês de vencimento)
  });

  it('Compra parcelada em 3x: cada parcela tem competência no mês correspondente', async () => {
    await createExpense({
      familyId,
      userId,
      description: 'Notebook Parcelado',
      amountCents: 300000, // R$ 3.000,00
      transactionDate: '2026-10-15',
      paymentMethod: 'credit',
      cardId: 'card-1',
      installmentCount: 3,
    });

    const installments = await db.installments.toArray();
    expect(installments).toHaveLength(3);

    // Ordena por número da parcela para garantir consistência
    installments.sort((a, b) => a.installmentNumber - b.installmentNumber);

    // Parcela 1: competência outubro (mês da compra)
    expect(installments[0]?.competenceMonth).toBe('2026-10-01');
    expect(installments[0]?.installmentNumber).toBe(1);

    // Parcela 2: competência novembro (compra + 1 mês)
    expect(installments[1]?.competenceMonth).toBe('2026-11-01');
    expect(installments[1]?.installmentNumber).toBe(2);

    // Parcela 3: competência dezembro (compra + 2 meses)
    expect(installments[2]?.competenceMonth).toBe('2026-12-01');
    expect(installments[2]?.installmentNumber).toBe(3);
  });
});
