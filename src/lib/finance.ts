import type { Transaction, TransactionType, TransactionWithCategory } from "@/db/schema";

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
}

export function sumByType<T extends Transaction>(
  transactions: T[],
  type: TransactionType,
): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + transaction.amount, 0);
}

export function calculateSummary<T extends Transaction>(transactions: T[]): FinancialSummary {
  const income = sumByType(transactions, "income");
  const expenses = sumByType(transactions, "expense");
  return { balance: income - expenses, income, expenses };
}

// "YYYY-MM" key for the given date (local time). Transaction dates are
// stored as "YYYY-MM-DD" strings, so a prefix match against this key is
// enough to tell whether a transaction falls in that month.
export function currentMonthKey(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function filterByMonth<T extends Transaction>(
  transactions: T[],
  monthKey: string = currentMonthKey(),
): T[] {
  return transactions.filter((transaction) => transaction.date.startsWith(monthKey));
}

export function filterByCurrency<T extends Transaction>(transactions: T[], currency: string): T[] {
  return transactions.filter((transaction) => transaction.currency === currency);
}

// Inclusive on both ends; a null bound means "unbounded on that side".
// Dates are "YYYY-MM-DD" strings, so lexicographic comparison is chronological.
export function filterByDateRange<T extends Transaction>(
  transactions: T[],
  from: string | null,
  to: string | null,
): T[] {
  return transactions.filter(
    (transaction) =>
      (from === null || transaction.date >= from) &&
      (to === null || transaction.date <= to),
  );
}

export function filterByCategory<T extends Transaction>(
  transactions: T[],
  categoryId: number,
): T[] {
  return transactions.filter((transaction) => transaction.category_id === categoryId);
}

export function filterByAmountRange<T extends Transaction>(
  transactions: T[],
  min: number | null,
  max: number | null,
): T[] {
  return transactions.filter(
    (transaction) =>
      (min === null || transaction.amount >= min) &&
      (max === null || transaction.amount <= max),
  );
}

export interface TransactionFilters {
  currency?: string | null;
  categoryId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
}

// Applies every provided filter in sequence. Omitted or null fields are
// treated as "no constraint", so the same function backs both the statistics
// filter bar and the transactions table's advanced panel.
export function applyTransactionFilters<T extends Transaction>(
  transactions: T[],
  filters: TransactionFilters,
): T[] {
  let result = transactions;

  if (filters.currency != null) {
    result = filterByCurrency(result, filters.currency);
  }
  if (filters.categoryId != null) {
    result = filterByCategory(result, filters.categoryId);
  }
  if (filters.dateFrom != null || filters.dateTo != null) {
    result = filterByDateRange(result, filters.dateFrom ?? null, filters.dateTo ?? null);
  }
  if (filters.minAmount != null || filters.maxAmount != null) {
    result = filterByAmountRange(result, filters.minAmount ?? null, filters.maxAmount ?? null);
  }

  return result;
}

export interface CategoryBreakdownEntry {
  categoryId: number | null;
  name: string;
  color: string;
  total: number;
}

const UNCATEGORIZED_COLOR = "#94a3b8";
const UNCATEGORIZED_LABEL = "Sin categoría";

// Sums expense transactions per category, using each category's own stored
// color so the chart legend stays consistent with the rest of the app.
export function groupExpensesByCategory(
  transactions: TransactionWithCategory[],
): CategoryBreakdownEntry[] {
  const totals = new Map<string, CategoryBreakdownEntry>();

  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;

    const key = transaction.category_id != null ? String(transaction.category_id) : "none";
    const existing = totals.get(key);
    if (existing) {
      existing.total += transaction.amount;
      continue;
    }

    totals.set(key, {
      categoryId: transaction.category_id,
      name: transaction.category_name ?? UNCATEGORIZED_LABEL,
      color: transaction.category_color ?? UNCATEGORIZED_COLOR,
      total: transaction.amount,
    });
  }

  return Array.from(totals.values()).sort((a, b) => b.total - a.total);
}

// Ascending "YYYY-MM" keys for the `count` months up to and including
// `referenceMonthKey`.
export function getRecentMonthKeys(
  count: number,
  referenceMonthKey: string = currentMonthKey(),
): string[] {
  const [year, month] = referenceMonthKey.split("-").map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(currentMonthKey(new Date(year, month - 1 - i, 1)));
  }
  return keys;
}

// Ascending month keys from `fromMonthKey` to `toMonthKey` inclusive, capped
// at `maxMonths` (keeping the most recent ones) so an extreme range can never
// produce an unreadable chart.
export function getMonthKeysBetween(
  fromMonthKey: string,
  toMonthKey: string,
  maxMonths = 12,
): string[] {
  const [fromYear, fromMonth] = fromMonthKey.split("-").map(Number);
  const [toYear, toMonth] = toMonthKey.split("-").map(Number);

  const span = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  if (span < 0) return [];

  const keys: string[] = [];
  for (let i = 0; i <= span; i++) {
    keys.push(currentMonthKey(new Date(fromYear, fromMonth - 1 + i, 1)));
  }
  return keys.slice(-maxMonths);
}

export interface MonthlyTrendEntry {
  monthKey: string;
  income: number;
  expenses: number;
}

export function buildMonthlyTrend(
  transactions: Transaction[],
  monthKeys: string[],
): MonthlyTrendEntry[] {
  return monthKeys.map((monthKey) => {
    const { income, expenses } = calculateSummary(filterByMonth(transactions, monthKey));
    return { monthKey, income, expenses };
  });
}
