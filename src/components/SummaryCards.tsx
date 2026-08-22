import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { FinancialSummary } from "@/lib/finance";

interface SummaryCardsProps {
  // Totals for the currently selected period/filters, not an all-time balance.
  summary: FinancialSummary;
  currency: string;
  isLoading: boolean;
  // The same totals expressed in the other currency, already converted with
  // each movement valued at its own date. Null when no quote is known at all.
  convertedSummary: FinancialSummary | null;
  convertedCurrency: string;
  // Whether the conversion used the historical series or just today's quote,
  // so the figures never imply more precision than they have.
  usesHistoricalRates: boolean;
}

const CARD_DEFINITIONS = [
  { key: "balance", label: "Balance", icon: Wallet, tone: "default" },
  { key: "income", label: "Ingresos", icon: TrendingUp, tone: "positive" },
  { key: "expenses", label: "Gastos", icon: TrendingDown, tone: "negative" },
] as const;

export function SummaryCards({
  summary,
  currency,
  isLoading,
  convertedSummary,
  convertedCurrency,
  usesHistoricalRates,
}: SummaryCardsProps) {
  const convertedValues: Record<
    (typeof CARD_DEFINITIONS)[number]["key"],
    number
  > | null = convertedSummary
    ? {
        balance: convertedSummary.balance,
        income: convertedSummary.income,
        expenses: convertedSummary.expenses,
      }
    : null;

  const values: Record<(typeof CARD_DEFINITIONS)[number]["key"], number> = {
    balance: summary.balance,
    income: summary.income,
    expenses: summary.expenses,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CARD_DEFINITIONS.map(({ key, label, icon: Icon, tone }) => (
        <Card key={key}>
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle
              className={cn(
                "text-2xl",
                tone === "positive" && "text-emerald-600 dark:text-emerald-400",
                tone === "negative" && "text-red-600 dark:text-red-400",
              )}
            >
              {isLoading ? "—" : formatCurrency(values[key], currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <Icon className="size-5 text-muted-foreground" />
            {!isLoading && convertedValues !== null && (
              <span
                className="text-xs text-muted-foreground"
                title={
                  usesHistoricalRates
                    ? "Cada movimiento valuado a la cotización de su fecha"
                    : "Valuado a la cotización de hoy. Traé el histórico en Ajustes para mayor precisión"
                }
              >
                ≈ {formatCurrency(convertedValues[key], convertedCurrency)}
                {!usesHistoricalRates && " *"}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
