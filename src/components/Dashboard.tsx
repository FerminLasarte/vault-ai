import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SummaryCards } from "@/components/SummaryCards";
import { MonthSelector } from "@/components/MonthSelector";
import { CurrencyFilter } from "@/components/CurrencyFilter";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionsList } from "@/components/TransactionsList";
import { CategoryBreakdownChart } from "@/components/charts/CategoryBreakdownChart";
import { IncomeVsExpenseChart } from "@/components/charts/IncomeVsExpenseChart";
import { useTransactions } from "@/hooks/useTransactions";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { currentMonthKey } from "@/lib/finance";
import { DEFAULT_DASHBOARD_CURRENCY } from "@/lib/currency";

export function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_DASHBOARD_CURRENCY);

  const {
    transactions,
    categories,
    isLoading,
    isMutating,
    addTransaction,
    generateSampleData,
  } = useTransactions();

  const { paymentMethods } = usePaymentMethods();

  const { balance, monthlySummary, categoryBreakdown, monthlyTrend, recentTransactions } =
    useDashboardMetrics(transactions, selectedMonth, selectedCurrency);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Resumen
          </h1>
          <p className="text-sm text-muted-foreground">
            Un vistazo rápido a tus finanzas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CurrencyFilter value={selectedCurrency} onChange={setSelectedCurrency} />
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <Button
            type="button"
            variant="outline"
            onClick={() => generateSampleData()}
            disabled={isMutating}
          >
            {isMutating ? "Generando..." : "Generar Datos de Prueba"}
          </Button>
        </div>
      </div>

      <SummaryCards
        balance={balance}
        monthlySummary={monthlySummary}
        currency={selectedCurrency}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryBreakdownChart
          data={categoryBreakdown}
          currency={selectedCurrency}
          isLoading={isLoading}
        />
        <IncomeVsExpenseChart
          data={monthlyTrend}
          currency={selectedCurrency}
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <TransactionForm
          categories={categories}
          paymentMethods={paymentMethods}
          defaultCurrency={selectedCurrency}
          onSubmitTransaction={addTransaction}
        />
        <TransactionsList transactions={recentTransactions} isLoading={isLoading} />
      </div>
    </div>
  );
}
