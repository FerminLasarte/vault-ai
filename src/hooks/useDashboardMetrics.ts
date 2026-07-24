import { useMemo } from "react";
import type { TransactionWithCategory } from "@/db";
import {
  buildMonthlyTrend,
  calculateSummary,
  filterByCurrency,
  filterByMonth,
  getRecentMonthKeys,
  groupExpensesByCategory,
  type CategoryBreakdownEntry,
  type FinancialSummary,
  type MonthlyTrendEntry,
} from "@/lib/finance";

const TREND_MONTHS = 6;

interface UseDashboardMetricsResult {
  balance: number;
  monthlySummary: FinancialSummary;
  categoryBreakdown: CategoryBreakdownEntry[];
  monthlyTrend: MonthlyTrendEntry[];
  recentTransactions: TransactionWithCategory[];
}

// Composes the pure functions in lib/finance.ts against the raw transaction
// list for a given selected currency and period. `transactions` is empty
// while data is still loading, so every derived value naturally comes out
// zero/empty. Every derived value is scoped to `selectedCurrency` first, so
// amounts in different currencies are never summed together.
export function useDashboardMetrics(
  transactions: TransactionWithCategory[],
  selectedMonth: string,
  selectedCurrency: string,
): UseDashboardMetricsResult {
  const currencyTransactions = useMemo(
    () => filterByCurrency(transactions, selectedCurrency),
    [transactions, selectedCurrency],
  );

  const monthlyTransactions = useMemo(
    () => filterByMonth(currencyTransactions, selectedMonth),
    [currencyTransactions, selectedMonth],
  );

  const balance = useMemo(
    () => calculateSummary(currencyTransactions).balance,
    [currencyTransactions],
  );

  const monthlySummary = useMemo(
    () => calculateSummary(monthlyTransactions),
    [monthlyTransactions],
  );

  const categoryBreakdown = useMemo(
    () => groupExpensesByCategory(monthlyTransactions),
    [monthlyTransactions],
  );

  const monthlyTrend = useMemo(
    () =>
      buildMonthlyTrend(currencyTransactions, getRecentMonthKeys(TREND_MONTHS, selectedMonth)),
    [currencyTransactions, selectedMonth],
  );

  // The history list intentionally ignores the currency filter (per product
  // decision) but still scopes to the selected month.
  const recentTransactions = useMemo(
    () => filterByMonth(transactions, selectedMonth),
    [transactions, selectedMonth],
  );

  return { balance, monthlySummary, categoryBreakdown, monthlyTrend, recentTransactions };
}
