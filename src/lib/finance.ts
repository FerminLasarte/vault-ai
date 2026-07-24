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
