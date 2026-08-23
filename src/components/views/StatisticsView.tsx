import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { PrintableReport } from "@/components/reports/PrintableReport";
import { buildReport } from "@/lib/report";
import { printWindow } from "@/lib/files";
import type { ViewProps } from "@/lib/menu";
import { CurrencyFilter } from "@/components/CurrencyFilter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "@/components/filters/CategorySelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import { SummaryCards } from "@/components/SummaryCards";
import { ExchangeRateBar } from "@/components/ExchangeRateBar";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart";
import { useAppData } from "@/hooks/useAppData";
import { AlertTriangle, HardDriveDownload, Printer, Repeat } from "lucide-react";
import {
  applyTransactionFilters,
  availableYears,
  buildMonthlyTrend,
  buildRateLookup,
  calculateBudgetProgress,
  calculateSummary,
  EMPTY_DATE_RANGE,
  currentMonthKey,
  exceededBudgets,
  getMonthKeysBetween,
  getRecentMonthKeys,
  groupExpensesByCategory,
  summaryInCurrency,
  yearFromRange,
  yearRange,
} from "@/lib/finance";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { collectPendingRecurrences } from "@/lib/pendingRecurring";
import { collectPendingInstallments } from "@/lib/pendingInstallments";
import { collectPendingLoanPayments } from "@/lib/pendingLoans";
import { backupStatus } from "@/lib/backupReminder";
import { todayIsoDate } from "@/lib/format";

const TREND_MONTHS = 6;

// Sentinel for "no year filter": the Select needs a concrete value, and no real
// year can collide with it.
const ALL_YEARS = "__all__";

export function StatisticsView({ request }: ViewProps) {
  const {
    transactions,
    categories,
    budgets,
    recurring,
    installmentPlans,
    loans,
    exchangeRate,
    exchangeRateHistory,
    lastBackupAt,
    isLoading,
  } = useAppData();

  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);

  // Deliberately computed from the unfiltered list: a budget is about the real
  // period total, not about whatever slice the user is currently looking at.
  const overspent = useMemo(
    () => exceededBudgets(calculateBudgetProgress(budgets, transactions)),
    [budgets, transactions],
  );

  // Every kind of pending commitment is surfaced together: separate notices
  // would make it easy to act on one and never notice the others.
  const pendingCount = useMemo(
    () =>
      collectPendingRecurrences(recurring, todayIsoDate()).length +
      collectPendingInstallments(installmentPlans, todayIsoDate()).length +
      collectPendingLoanPayments(loans, todayIsoDate()).length,
    [recurring, installmentPlans, loans],
  );

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

  const backup = useMemo(
    () => backupStatus(lastBackupAt, transactions.length),
    [lastBackupAt, transactions.length],
  );

  const report = useMemo(
    () =>
      buildReport(
        { transactions, categories, budgets },
        { currency, categoryId, dateRange },
      ),
    [transactions, categories, budgets, currency, categoryId, dateRange],
  );

  // "Imprimir informe" from the Archivo menu. A ref rather than state: which
  // click was already handled is bookkeeping and nothing renders from it.
  const lastRequestSeq = useRef(request?.seq ?? 0);
  useEffect(() => {
    if (request === null || request.seq === lastRequestSeq.current) return;
    lastRequestSeq.current = request.seq;
    if (request.action === "print-report") void printWindow();
  }, [request]);

  const years = useMemo(() => availableYears(transactions), [transactions]);

  // Derived from the range rather than held separately: with its own state the
  // selector could end up naming a year the charts are no longer showing.
  const selectedYear = yearFromRange(dateRange);

  const summary = useMemo(() => calculateSummary(filtered), [filtered]);

  // Built from the cached series so each movement is valued at the rate that
  // was in force on its own date. Falls back to today's quote when no history
  // has been downloaded yet, which is the previous behaviour.
  const rateAt = useMemo(
    () =>
      exchangeRateHistory.length > 0
        ? buildRateLookup(exchangeRateHistory)
        : buildRateLookup(exchangeRate ? [exchangeRate] : []),
    [exchangeRateHistory, exchangeRate],
  );

  const otherCurrency = currency === "ARS" ? "USD" : "ARS";

  const convertedSummary = useMemo(
    () => summaryInCurrency(filtered, otherCurrency, rateAt),
    [filtered, otherCurrency, rateAt],
  );
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
        actions={
          <Button type="button" variant="outline" onClick={() => void printWindow()}>
            <Printer />
            Imprimir informe
          </Button>
        }
      />

      {/* Hidden on screen and revealed only by the print stylesheet, so what is
          printed is built from the same filters the user is looking at rather
          than from a second set they would have to keep in sync. */}
      <PrintableReport report={report} />

      {overspent.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <span className="text-sm font-medium">
              {overspent.length === 1
                ? "Superaste un presupuesto"
                : `Superaste ${overspent.length} presupuestos`}
            </span>
            <span className="text-sm text-muted-foreground">
              {overspent
                .map(
                  (entry) =>
                    `${entry.budget.category_name} (${Math.round(entry.ratio * 100)}%)`,
                )
                .join(" · ")}
            </span>
          </CardContent>
        </Card>
      )}

      {backup.isOverdue && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <HardDriveDownload className="size-4 shrink-0 text-destructive" />
            <span className="text-sm font-medium">
              {backup.daysAgo === null
                ? "Nunca guardaste una copia de seguridad"
                : `Hace ${backup.daysAgo} días que no guardás una copia`}
            </span>
            <span className="text-sm text-muted-foreground">
              Tus datos viven solo en este equipo. Guardá una desde Ajustes.
            </span>
          </CardContent>
        </Card>
      )}

      {pendingCount > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Repeat className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium">
              {pendingCount === 1
                ? "Tenés 1 movimiento pendiente de confirmar"
                : `Tenés ${pendingCount} movimientos pendientes de confirmar`}
            </span>
            <span className="text-sm text-muted-foreground">
              Revisalos en Recurrentes y en Deudas.
            </span>
          </CardContent>
        </Card>
      )}

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

          {years.length > 0 && (
            <div className="flex min-w-36 flex-col gap-1.5">
              <Label htmlFor="statistics-year">Año</Label>
              <Select
                items={{
                  [ALL_YEARS]: "Todos",
                  ...Object.fromEntries(
                    years.map((year) => [String(year), String(year)]),
                  ),
                }}
                value={selectedYear === null ? ALL_YEARS : String(selectedYear)}
                onValueChange={(value) =>
                  setDateRange(
                    String(value) === ALL_YEARS
                      ? EMPTY_DATE_RANGE
                      : yearRange(Number(value)),
                  )
                }
              >
                <SelectTrigger id="statistics-year" className="w-full">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_YEARS}>Todos</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

      <div className="flex flex-col gap-3">
        <SummaryCards
          summary={summary}
          convertedSummary={convertedSummary}
          convertedCurrency={otherCurrency}
          currency={currency}
          isLoading={isLoading}
          usesHistoricalRates={exchangeRateHistory.length > 0}
        />
        <ExchangeRateBar />
      </div>

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
