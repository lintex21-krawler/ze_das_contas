import { describe, it, expect } from 'vitest';
import { resolveInvoiceCycle } from './invoiceCycle';

describe('Domain: Invoice Cycle Calculator', () => {
  it('deve atribuir compra antes do fechamento à fatura do mês atual', () => {
    // Compra dia 10 de maio, cartão fecha dia 20 e vence dia 27
    const result = resolveInvoiceCycle('2026-05-10', 20, 27, 'include_closing_day');

    expect(result.closingDate).toBe('2026-05-20');
    expect(result.dueDate).toBe('2026-05-27');
    expect(result.referenceMonth).toBe('2026-05-01');
  });

  it('deve incluir compra no próprio dia de fechamento quando a política for include_closing_day', () => {
    const result = resolveInvoiceCycle('2026-05-20', 20, 27, 'include_closing_day');

    expect(result.closingDate).toBe('2026-05-20');
    expect(result.dueDate).toBe('2026-05-27');
  });

  it('deve enviar para a próxima fatura compra no dia de fechamento quando política for exclude_closing_day', () => {
    const result = resolveInvoiceCycle('2026-05-20', 20, 27, 'exclude_closing_day');

    expect(result.closingDate).toBe('2026-06-20');
    expect(result.dueDate).toBe('2026-06-27');
  });

  it('deve jogar compra após o fechamento para a fatura do mês seguinte', () => {
    const result = resolveInvoiceCycle('2026-05-21', 20, 27, 'include_closing_day');

    expect(result.closingDate).toBe('2026-06-20');
    expect(result.dueDate).toBe('2026-06-27');
    expect(result.referenceMonth).toBe('2026-06-01');
  });

  it('deve tratar vencimento no mês seguinte quando dia de vencimento for menor que dia de fechamento', () => {
    // Fecha dia 25 e vence dia 5
    const result = resolveInvoiceCycle('2026-05-10', 25, 5, 'include_closing_day');

    expect(result.closingDate).toBe('2026-05-25');
    expect(result.dueDate).toBe('2026-06-05');
    expect(result.referenceMonth).toBe('2026-06-01');
  });

  it('deve ajustar dias inexistentes em Fevereiro (ex: dia 31 em ano não bissexto)', () => {
    // Cartão configurado com dia 31, em Fevereiro deve fechar dia 28
    const result = resolveInvoiceCycle('2026-02-15', 31, 10, 'include_closing_day');

    expect(result.closingDate).toBe('2026-02-28');
    expect(result.dueDate).toBe('2026-03-10');
  });
});
