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
}

const CARD_DEFINITIONS = [
  { key: "balance", label: "Balance", icon: Wallet, tone: "default" },
  { key: "income", label: "Ingresos", icon: TrendingUp, tone: "positive" },
  { key: "expenses", label: "Gastos", icon: TrendingDown, tone: "negative" },
] as const;

export function SummaryCards({ summary, currency, isLoading }: SummaryCardsProps) {
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
          <CardContent>
            <Icon className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
