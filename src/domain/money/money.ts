/**
 * Representa um valor monetário em centavos inteiros (ex: R$ 10,50 = 1050).
 * Nunca utilize números de ponto flutuante para dinheiro.
 */
export type MoneyCents = number;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

/**
 * Valida se um número é um inteiro seguro representando centavos.
 */
export function isValidMoneyCents(cents: number): boolean {
  return Number.isSafeInteger(cents);
}

/**
 * Formata centavos em moeda brasileira no formato R$ 1.234,56.
 * Aceita opção para exibir sinal explícito (+/-).
 */
export function formatBRL(
  cents: MoneyCents,
  options?: { showPositiveSign?: boolean }
): string {
  if (!isValidMoneyCents(cents)) {
    throw new MoneyError(`Valor monetário inválido: ${cents}`);
  }

  const isNegative = cents < 0;
  const absoluteCents = Math.abs(cents);
  const reais = absoluteCents / 100;

  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);

  if (isNegative) {
    return `- ${formatted}`;
  }

  if (options?.showPositiveSign && cents > 0) {
    return `+ ${formatted}`;
  }

  return formatted;
}

/**
 * Converte uma entrada de texto formatada (ex: "R$ 1.234,56", "10,50", "100") em centavos inteiros.
 */
export function parseCurrencyInput(rawInput: string): MoneyCents {
  if (!rawInput || typeof rawInput !== 'string') {
    return 0;
  }

  // Remove caracteres que não sejam dígitos, sinal de menos ou vírgula/ponto
  const cleaned = rawInput.trim();
  const isNegative = cleaned.startsWith('-');

  const onlyDigits = cleaned.replace(/\D/g, '');
  if (!onlyDigits) {
    return 0;
  }

  const parsed = parseInt(onlyDigits, 10);
  if (!Number.isSafeInteger(parsed)) {
    throw new MoneyError('Valor informado excede o limite numérico seguro.');
  }

  return isNegative ? -parsed : parsed;
}

/**
 * Soma dois valores em centavos.
 */
export function addMoney(a: MoneyCents, b: MoneyCents): MoneyCents {
  const result = a + b;
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError('Resultado da soma excede o limite numérico seguro.');
  }
  return result;
}

/**
 * Subtrai b de a em centavos.
 */
export function subtractMoney(a: MoneyCents, b: MoneyCents): MoneyCents {
  const result = a - b;
  if (!Number.isSafeInteger(result)) {
    throw new MoneyError('Resultado da subtração excede o limite numérico seguro.');
  }
  return result;
}

/**
 * Divide um valor total em N parcelas distribuindo os centavos residuais
 * deterministamente nas primeiras parcelas. A soma das parcelas é SEMPRE igual a totalCents.
 *
 * Exemplo: R$ 10,00 (1000 centavos) em 3 parcelas:
 * base = 333
 * resto = 1
 * Parcela 1: 334 (R$ 3,34)
 * Parcela 2: 333 (R$ 3,33)
 * Parcela 3: 333 (R$ 3,33)
 * Soma: 1000 centavos.
 */
export function splitAmountIntoInstallments(
  totalCents: MoneyCents,
  installmentCount: number
): MoneyCents[] {
  if (!isValidMoneyCents(totalCents) || totalCents <= 0) {
    throw new MoneyError('O valor total do parcelamento deve ser positivo.');
  }
  if (!Number.isInteger(installmentCount) || installmentCount <= 0) {
    throw new MoneyError('A quantidade de parcelas deve ser um número inteiro positivo.');
  }

  const base = Math.floor(totalCents / installmentCount);
  const remainder = totalCents % installmentCount;

  const installments: MoneyCents[] = [];
  for (let i = 0; i < installmentCount; i++) {
    installments.push(i < remainder ? base + 1 : base);
  }

  // Verificação de integridade (soma exata)
  const sum = installments.reduce((acc, curr) => acc + curr, 0);
  if (sum !== totalCents) {
    throw new MoneyError('Falha de integridade: a soma das parcelas diverge do total.');
  }

  return installments;
}
