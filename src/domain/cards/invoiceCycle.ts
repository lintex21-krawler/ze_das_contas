import {
  parseISO,
  format,
  getYear,
  getMonth,
  getDate,
  addMonths,
  subMonths,
  lastDayOfMonth,
  isBefore,
  isEqual,
  startOfMonth,
} from 'date-fns';

export interface InvoiceCycleResult {
  cycleStart: string; // 'YYYY-MM-DD'
  closingDate: string; // 'YYYY-MM-DD'
  dueDate: string; // 'YYYY-MM-DD'
  referenceMonth: string; // 'YYYY-MM-01'
}

/**
 * Ajusta um dia desejado para caber no mês especificado.
 * Exemplo: dia 31 em Fevereiro (28 dias) retorna dia 28.
 */
function clampDayToMonth(year: number, monthIndex: number, desiredDay: number): Date {
  const baseDate = new Date(year, monthIndex, 1);
  const maxDay = getDate(lastDayOfMonth(baseDate));
  const effectiveDay = Math.min(desiredDay, maxDay);
  return new Date(year, monthIndex, effectiveDay);
}

/**
 * Calcula deterministamente a fatura de destino de uma transação de cartão de crédito.
 *
 * @param transactionDateStr Data da transação ('YYYY-MM-DD')
 * @param closingDay Dia de fechamento do cartão (1..31)
 * @param dueDay Dia de vencimento do cartão (1..31)
 * @param closingDayPolicy 'include_closing_day' (padrão) ou 'exclude_closing_day'
 */
export function resolveInvoiceCycle(
  transactionDateStr: string,
  closingDay: number,
  dueDay: number,
  closingDayPolicy: 'include_closing_day' | 'exclude_closing_day' = 'include_closing_day'
): InvoiceCycleResult {
  const txDate = parseISO(transactionDateStr);
  const txYear = getYear(txDate);
  const txMonth = getMonth(txDate);

  // Calcula o dia de fechamento para o mês da transação
  const currentMonthClosing = clampDayToMonth(txYear, txMonth, closingDay);

  let targetClosingDate: Date;

  if (closingDayPolicy === 'include_closing_day') {
    // Compra no dia do fechamento AINDA entra na fatura que fecha hoje
    if (isBefore(txDate, currentMonthClosing) || isEqual(txDate, currentMonthClosing)) {
      targetClosingDate = currentMonthClosing;
    } else {
      // Compra após o fechamento vai para o próximo mês
      const nextMonth = addMonths(new Date(txYear, txMonth, 1), 1);
      targetClosingDate = clampDayToMonth(getYear(nextMonth), getMonth(nextMonth), closingDay);
    }
  } else {
    // Compra no dia do fechamento já pertence à próxima fatura
    if (isBefore(txDate, currentMonthClosing)) {
      targetClosingDate = currentMonthClosing;
    } else {
      const nextMonth = addMonths(new Date(txYear, txMonth, 1), 1);
      targetClosingDate = clampDayToMonth(getYear(nextMonth), getMonth(nextMonth), closingDay);
    }
  }

  // O ciclo inicia no dia seguinte ao fechamento anterior
  const prevMonth = subMonths(targetClosingDate, 1);
  const prevClosing = clampDayToMonth(getYear(prevMonth), getMonth(prevMonth), closingDay);
  const cycleStart = new Date(prevClosing);
  cycleStart.setDate(cycleStart.getDate() + 1);

  // Vencimento da fatura
  // Se o dueDay for menor que o closingDay, o vencimento ocorre no mês seguinte ao fechamento
  let targetDueDate: Date;
  const closingYear = getYear(targetClosingDate);
  const closingMonth = getMonth(targetClosingDate);

  if (dueDay > closingDay) {
    targetDueDate = clampDayToMonth(closingYear, closingMonth, dueDay);
  } else {
    const nextMonth = addMonths(new Date(closingYear, closingMonth, 1), 1);
    targetDueDate = clampDayToMonth(getYear(nextMonth), getMonth(nextMonth), dueDay);
  }

  // Mês de referência (Competência da fatura: primeiro dia do mês de vencimento)
  const referenceMonthDate = startOfMonth(targetDueDate);

  return {
    cycleStart: format(cycleStart, 'yyyy-MM-dd'),
    closingDate: format(targetClosingDate, 'yyyy-MM-dd'),
    dueDate: format(targetDueDate, 'yyyy-MM-dd'),
    referenceMonth: format(referenceMonthDate, 'yyyy-MM-dd'),
  };
}
