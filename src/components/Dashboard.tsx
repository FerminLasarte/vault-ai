import { useCallback, useEffect, useState } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TransactionForm } from "@/components/TransactionForm";
import { initDatabase, insertRandomTransactions, listTransactions } from "@/db";

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

interface Summary {
  balance: number;
  income: number;
  expenses: number;
}

const EMPTY_SUMMARY: Summary = { balance: 0, income: 0, expenses: 0 };

export function Dashboard() {
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const refreshSummary = useCallback(async () => {
    await initDatabase();
    const transactions = await listTransactions();

    const income = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);

    const expenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0);

    setSummary({ balance: income - expenses, income, expenses });
  }, []);

  useEffect(() => {
    refreshSummary()
      .catch((error) => {
        console.error("Failed to load dashboard summary:", error);
      })
      .finally(() => setIsLoading(false));
  }, [refreshSummary]);

  async function handleGenerateSampleData() {
    setIsSeeding(true);
    try {
      await insertRandomTransactions(5);
      await refreshSummary();
    } catch (error) {
      console.error("Failed to generate sample data:", error);
    } finally {
      setIsSeeding(false);
    }
  }

  const summaryCards = [
    {
      label: "Balance Total",
      value: summary.balance,
      icon: Wallet,
      tone: "default",
    },
    {
      label: "Ingresos",
      value: summary.income,
      icon: TrendingUp,
      tone: "positive",
    },
    {
      label: "Gastos",
      value: summary.expenses,
      icon: TrendingDown,
      tone: "negative",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Resumen
          </h1>
          <p className="text-sm text-muted-foreground">
            Un vistazo rápido a tus finanzas.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGenerateSampleData}
          disabled={isSeeding}
        >
          {isSeeding ? "Generando..." : "Generar Datos de Prueba"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle
                className={cn(
                  "text-2xl",
                  tone === "positive" && "text-emerald-600 dark:text-emerald-400",
                  tone === "negative" && "text-red-600 dark:text-red-400",
                )}
              >
                {isLoading ? "—" : currencyFormatter.format(value)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Icon className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <TransactionForm onTransactionCreated={refreshSummary} />
    </div>
  );
}
