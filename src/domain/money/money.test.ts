import { describe, it, expect } from 'vitest';
import {
  formatBRL,
  parseCurrencyInput,
  addMoney,
  subtractMoney,
  splitAmountIntoInstallments,
  MoneyError,
} from './money';

describe('Domain: Money', () => {
  describe('formatBRL', () => {
    it('deve formatar centavos positivos para o padrão pt-BR', () => {
      expect(formatBRL(123456)).toBe('R$\u00A01.234,56');
      expect(formatBRL(0)).toBe('R$\u00A00,00');
      expect(formatBRL(5)).toBe('R$\u00A00,05');
    });

    it('deve formatar valores negativos', () => {
      expect(formatBRL(-5000)).toBe('- R$\u00A050,00');
    });

    it('deve exibir sinal positivo opcional', () => {
      expect(formatBRL(5000, { showPositiveSign: true })).toBe('+ R$\u00A050,00');
    });
  });

  describe('parseCurrencyInput', () => {
    it('deve converter string digitada para centavos inteiros', () => {
      expect(parseCurrencyInput('1234,56')).toBe(123456);
      expect(parseCurrencyInput('R$ 10,00')).toBe(1000);
      expect(parseCurrencyInput('50')).toBe(50);
      expect(parseCurrencyInput('')).toBe(0);
    });
  });

  describe('addMoney e subtractMoney', () => {
    it('deve somar valores em centavos com precisão exata', () => {
      expect(addMoney(1050, 2025)).toBe(3075);
    });

    it('deve subtrair valores em centavos', () => {
      expect(subtractMoney(3000, 1250)).toBe(1750);
    });
  });

  describe('splitAmountIntoInstallments (Integridade Financeira)', () => {
    it('Caso 1 de referência: Compra de R$ 100,00 em 3 parcelas (soma = R$ 100,00)', () => {
      const total = 10000; // 100,00
      const installments = splitAmountIntoInstallments(total, 3);

      expect(installments).toHaveLength(3);
      expect(installments).toEqual([3334, 3333, 3333]);
      expect(installments.reduce((a, b) => a + b, 0)).toBe(total);
    });

    it('Caso 2 de referência: Compra de R$ 10,00 em 3 parcelas (R$ 3,34 + R$ 3,33 + R$ 3,33)', () => {
      const total = 1000; // 10,00
      const installments = splitAmountIntoInstallments(total, 3);

      expect(installments).toHaveLength(3);
      expect(installments).toEqual([334, 333, 333]);
      expect(installments.reduce((a, b) => a + b, 0)).toBe(total);
    });

    it('Divisão exata sem restos: R$ 50,00 em 2 parcelas', () => {
      const total = 5000;
      const installments = splitAmountIntoInstallments(total, 2);

      expect(installments).toEqual([2500, 2500]);
      expect(installments.reduce((a, b) => a + b, 0)).toBe(total);
    });

    it('deve rejeitar valor total menor ou igual a zero ou parcelas inválidas', () => {
      expect(() => splitAmountIntoInstallments(0, 3)).toThrow(MoneyError);
      expect(() => splitAmountIntoInstallments(1000, 0)).toThrow(MoneyError);
      expect(() => splitAmountIntoInstallments(1000, -1)).toThrow(MoneyError);
    });
  });
});
