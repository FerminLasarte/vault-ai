import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { CurrencyFilter } from "@/components/CurrencyFilter";
import { CategorySelect } from "@/components/filters/CategorySelect";
import { DateRangePicker, EMPTY_DATE_RANGE } from "@/components/DateRangePicker";
import { SummaryCards } from "@/components/SummaryCards";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart";
import { useAppData } from "@/hooks/useAppData";
import {
  applyTransactionFilters,
  buildMonthlyTrend,
  calculateSummary,
  currentMonthKey,
  getMonthKeysBetween,
  getRecentMonthKeys,
  groupExpensesByCategory,
} from "@/lib/finance";
import { DEFAULT_DASHBOARD_CURRENCY } from "@/lib/currency";

const TREND_MONTHS = 6;

export function StatisticsView() {
  const { transactions, categories, isLoading } = useAppData();

  const [currency, setCurrency] = useState(DEFAULT_DASHBOARD_CURRENCY);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);

  // Every chart and KPI below reads from this single filtered list, so the
  // three filters combine naturally and recalculate on any change.
  const filtered = useMemo(
    () =>
      applyTransactionFilters(transactions, {
        currency,
        categoryId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      }),
    [transactions, currency, categoryId, dateRange],
  );

  const summary = useMemo(() => calculateSummary(filtered), [filtered]);
  const categoryBreakdown = useMemo(() => groupExpensesByCategory(filtered), [filtered]);

  // The trend spans the selected range when there is one, and the last six
  // months otherwise.
  const monthKeys = useMemo(() => {
    if (dateRange.from || dateRange.to) {
      const from = (dateRange.from ?? dateRange.to ?? "").slice(0, 7);
      const to = (dateRange.to ?? dateRange.from ?? "").slice(0, 7);
      return getMonthKeysBetween(from, to);
    }
    return getRecentMonthKeys(TREND_MONTHS, currentMonthKey());
  }, [dateRange]);

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(filtered, monthKeys),
    [filtered, monthKeys],
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Estadísticas"
        description="Analiza tus finanzas con filtros combinables."
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="statistics-currency">Moneda</Label>
            <CurrencyFilter value={currency} onChange={setCurrency} />
          </div>

          <div className="flex min-w-52 flex-col gap-1.5">
            <Label htmlFor="statistics-category">Categoría</Label>
            <CategorySelect
              id="statistics-category"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="statistics-dates">Rango de fechas</Label>
            <DateRangePicker
              id="statistics-dates"
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </CardContent>
      </Card>

      <SummaryCards summary={summary} currency={currency} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryBreakdownChart
          data={categoryBreakdown}
          currency={currency}
          isLoading={isLoading}
        />
        <IncomeVsExpenseChart
          data={monthlyTrend}
          currency={currency}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
