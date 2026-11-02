import { MoneyCents, addMoney, subtractMoney } from '../money/money';
import { LocalAccountMovement, LocalAccount } from '@/infrastructure/local/types';

/**
 * Calcula o saldo real de uma conta bancária com precisão exata em centavos:
 * saldo = saldo_inicial + entradas_liquidadas - saídas_liquidadas.
 *
 * Movimentações consideradas:
 * Entradas: 'income', 'transfer_in'
 * Saídas: 'expense', 'transfer_out', 'invoice_payment'
 * Ajustes: 'adjustment' (pode ser positivo ou negativo)
 */
export function calculateAccountBalance(
  initialBalanceCents: MoneyCents,
  movements: LocalAccountMovement[]
): MoneyCents {
  let currentBalance = initialBalanceCents;

  for (const mov of movements) {
    if (mov.deletedAt) continue;

    switch (mov.movementType) {
      case 'income':
      case 'transfer_in':
        currentBalance = addMoney(currentBalance, mov.amountCents);
        break;
      case 'expense':
      case 'transfer_out':
      case 'invoice_payment':
        currentBalance = subtractMoney(currentBalance, mov.amountCents);
        break;
      case 'adjustment':
        // Ajuste explícito de saldo
        currentBalance = addMoney(currentBalance, mov.amountCents);
        break;
    }
  }

  return currentBalance;
}

/**
 * Calcula o saldo consolidado de todas as contas ativas da família.
 */
export function calculateConsolidatedBalance(
  accounts: LocalAccount[],
  movements: LocalAccountMovement[]
): MoneyCents {
  const activeAccounts = accounts.filter((a) => a.isActive && !a.deletedAt);
  let total = 0;

  for (const acc of activeAccounts) {
    const accMovements = movements.filter((m) => m.accountId === acc.id);
    const balance = calculateAccountBalance(acc.initialBalanceCents, accMovements);
    total = addMoney(total, balance);
  }

  return total;
}
