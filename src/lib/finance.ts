import type {
  PaymentMethod,
  Transaction,
  TransactionType,
  TransactionWithCategory,
} from "@/db/schema";

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

// Strips diacritics and case so "nomina" matches "Nómina": Spanish
// descriptions get typed without accents far more often than with them.
function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Matches against the description. An empty or whitespace-only query means
// "no constraint" rather than "match nothing".
export function filterBySearch<T extends Transaction>(
  transactions: T[],
  query: string,
): T[] {
  const needle = normalizeForSearch(query.trim());
  if (needle === "") return transactions;

  return transactions.filter((transaction) =>
    normalizeForSearch(transaction.description).includes(needle),
  );
}

export interface TransactionFilters {
  currency?: string | null;
  search?: string | null;
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
  if (filters.search != null) {
    result = filterBySearch(result, filters.search);
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

// Current balance of every account, keyed by account id: its opening balance
// plus each movement that touched it. Built in a single pass over the
// transactions so the cost stays linear regardless of how many accounts exist.
export function calculateAccountBalances(
  accounts: PaymentMethod[],
  transactions: Transaction[],
): Map<number, number> {
  const balances = new Map(
    accounts.map((account) => [account.id, account.initial_balance]),
  );

  // A movement can point at an account that no longer exists: it stays in the
  // history, but must not conjure a balance for a deleted account.
  const applyDelta = (accountId: number | null, delta: number) => {
    if (accountId === null) return;
    const current = balances.get(accountId);
    if (current === undefined) return;
    balances.set(accountId, current + delta);
  };

  for (const transaction of transactions) {
    if (transaction.type === "income") {
      applyDelta(transaction.payment_method_id, transaction.amount);
    } else if (transaction.type === "expense") {
      applyDelta(transaction.payment_method_id, -transaction.amount);
    } else {
      // A transfer leaves one account and lands in another. The two legs are
      // recorded separately, so a cross-currency transfer moves the real figure
      // on each side without needing an exchange rate.
      applyDelta(transaction.payment_method_id, -transaction.amount);
      applyDelta(
        transaction.destination_payment_method_id,
        transaction.destination_amount ?? transaction.amount,
      );
    }
  }

  return balances;
}

// Totals the account balances per currency, so the Accounts view can show what
// the user holds in each currency without mixing units.
export function totalBalanceByCurrency(
  accounts: PaymentMethod[],
  balances: Map<number, number>,
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const account of accounts) {
    const balance = balances.get(account.id) ?? 0;
    totals.set(account.currency, (totals.get(account.currency) ?? 0) + balance);
  }

  return totals;
}

// Converts between the two supported currencies. `rate` is how many ARS one
// USD is worth — the MEP sell figure, i.e. what buying a dollar costs. The
// same number is used in both directions so a round trip returns the original
// amount instead of quietly losing the spread.
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rate: number,
): number | null {
  if (from === to) return amount;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  if (from === "ARS" && to === "USD") return amount / rate;
  if (from === "USD" && to === "ARS") return amount * rate;
  return null;
}

// Collapses per-currency totals into a single figure. Returns null when any
// currency cannot be converted, rather than skipping it and reporting a net
// worth that is quietly too low — a wrong number is worse than no number.
export function consolidateByCurrency(
  totals: Map<string, number>,
  targetCurrency: string,
  rate: number,
): number | null {
  let consolidated = 0;

  for (const [currency, amount] of totals) {
    const converted = convertAmount(amount, currency, targetCurrency, rate);
    if (converted === null) return null;
    consolidated += converted;
  }

  return consolidated;
}
