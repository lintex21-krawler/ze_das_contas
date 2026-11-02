import { db } from '@/infrastructure/local/db';
import { format as formatDate } from 'date-fns';

export type ExportFormat = 'json' | 'csv';

interface ExportMetadata {
  exportedAt: string;
  familyId: string;
  familyName: string;
  version: string;
}

interface ExportDataJSON {
  metadata: ExportMetadata;
  accounts: any[];
  cards: any[];
  categories: any[];
  transactions: any[];
  installmentPlans: any[];
  installments: any[];
  invoices: any[];
  invoicePayments: any[];
  transfers: any[];
  budgets: any[];
  shoppingLists: any[];
  shoppingItems: any[];
}

/**
 * Exporta todos os dados financeiros da família em formato JSON ou CSV.
 * Não exporta dados sensíveis de autenticação ou tokens.
 */
export async function exportFamilyData(
  familyId: string,
  familyName: string,
  format: ExportFormat
): Promise<Blob> {
  // Coleta todos os dados da família
  const [
    accounts,
    cards,
    categories,
    transactions,
    installmentPlans,
    installments,
    invoices,
    invoicePayments,
    transfers,
    budgets,
    shoppingLists,
    shoppingItems,
  ] = await Promise.all([
    db.accounts.where('familyId').equals(familyId).toArray(),
    db.cards.where('familyId').equals(familyId).toArray(),
    db.categories.where('familyId').equals(familyId).toArray(),
    db.transactions.where('familyId').equals(familyId).toArray(),
    db.installmentPlans.where('familyId').equals(familyId).toArray(),
    db.installments.where('familyId').equals(familyId).toArray(),
    db.invoices.where('familyId').equals(familyId).toArray(),
    db.invoicePayments.where('familyId').equals(familyId).toArray(),
    db.transfers.where('familyId').equals(familyId).toArray(),
    db.budgets.where('familyId').equals(familyId).toArray(),
    db.shoppingLists.where('familyId').equals(familyId).toArray(),
    db.shoppingItems.where('familyId').equals(familyId).toArray(),
  ]);

  const metadata: ExportMetadata = {
    exportedAt: new Date().toISOString(),
    familyId,
    familyName,
    version: '1.0',
  };

  if (format === 'json') {
    return exportAsJSON({
      metadata,
      accounts,
      cards,
      categories,
      transactions,
      installmentPlans,
      installments,
      invoices,
      invoicePayments,
      transfers,
      budgets,
      shoppingLists,
      shoppingItems,
    });
  } else {
    return exportAsCSV({
      metadata,
      transactions,
      accounts,
      cards,
      categories,
    });
  }
}

/**
 * Exporta dados completos em formato JSON estruturado.
 */
function exportAsJSON(data: ExportDataJSON): Blob {
  const jsonString = JSON.stringify(data, null, 2);
  return new Blob([jsonString], { type: 'application/json' });
}

/**
 * Exporta transações em formato CSV para análise em planilhas.
 * Inclui apenas as transações principais com informações essenciais.
 */
function exportAsCSV(data: {
  metadata: ExportMetadata;
  transactions: any[];
  accounts: any[];
  cards: any[];
  categories: any[];
}): Blob {
  const { transactions, accounts, cards, categories } = data;

  // Cria mapas para lookup rápido
  const accountsMap = new Map(accounts.map((a) => [a.id, a.name]));
  const cardsMap = new Map(cards.map((c) => [c.id, c.name]));
  const categoriesMap = new Map(categories.map((c) => [c.id, c.name]));

  // Cabeçalho CSV
  const headers = [
    'Data',
    'Tipo',
    'Descrição',
    'Categoria',
    'Valor (R$)',
    'Forma de Pagamento',
    'Conta/Cartão',
    'Status',
    'Data de Competência',
    'Observações',
  ];

  // Linhas de dados
  const rows = transactions.map((tx) => {
    const accountName = tx.accountId ? accountsMap.get(tx.accountId) || '' : '';
    const cardName = tx.cardId ? cardsMap.get(tx.cardId) || '' : '';
    const categoryName = tx.categoryId ? categoriesMap.get(tx.categoryId) || 'Sem categoria' : 'Sem categoria';
    const accountOrCard = cardName || accountName;

    const valueInReais = (tx.amountCents / 100).toFixed(2).replace('.', ',');
    const typeLabel =
      tx.transactionType === 'expense'
        ? 'Despesa'
        : tx.transactionType === 'income'
        ? 'Receita'
        : 'Ajuste';

    const paymentMethodLabel = tx.paymentMethod
      ? ({
          cash: 'Dinheiro',
          pix: 'PIX',
          debit: 'Débito',
          credit: 'Crédito',
          other: 'Outro',
        } as Record<string, string>)[tx.paymentMethod] || tx.paymentMethod
      : '';

    const statusLabel =
      tx.status === 'settled'
        ? 'Liquidado'
        : tx.status === 'planned'
        ? 'Previsto'
        : tx.status === 'cancelled'
        ? 'Cancelado'
        : tx.status;

    return [
      tx.transactionDate,
      typeLabel,
      escapeCSV(tx.description),
      escapeCSV(categoryName),
      valueInReais,
      paymentMethodLabel,
      escapeCSV(accountOrCard),
      statusLabel,
      tx.competenceMonth || '',
      escapeCSV(tx.notes || ''),
    ];
  });

  // Ordena por data decrescente
  rows.sort((a, b) => b[0].localeCompare(a[0]));

  // Monta CSV
  const csvContent = [headers, ...rows]
    .map((row) => row.join(';'))
    .join('\n');

  // BOM para Excel reconhecer UTF-8
  const bom = '\uFEFF';
  return new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
}

/**
 * Escapa valores CSV para evitar quebra de colunas.
 */
function escapeCSV(value: string): string {
  if (!value) return '';
  // Se contém vírgula, ponto-e-vírgula ou quebra de linha, envolve em aspas
  if (value.includes(',') || value.includes(';') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Gera nome de arquivo para o export.
 */
export function generateExportFilename(familyName: string, exportFormat: ExportFormat): string {
  const timestamp = formatDate(new Date(), 'yyyy-MM-dd_HHmmss');
  const sanitizedName = familyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);

  return `ze-das-contas_${sanitizedName}_${timestamp}.${exportFormat}`;
}

/**
 * Dispara download do arquivo no navegador.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
