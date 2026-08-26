import { PiggyBank, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatMonthLabel, formatPercent } from "@/lib/format";
import type { MonthOverview } from "@/lib/monthOverview";

interface MonthOverviewCardsProps {
  overview: MonthOverview;
  currency: string;
  isLoading: boolean;
}

const PLACEHOLDER = "—";

// The bar under the budget and savings figures. Same shape as the one in the
// budgets screen: the fill is capped at full width while the ratio beside it
// stays truthful, so "140%" can be read without the bar overflowing its track.
function ProgressBar({
  ratio,
  tone,
}: {
  ratio: number;
  tone: "primary" | "destructive";
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          tone === "destructive" ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
      />
    </div>
  );
}

function MonthExpensesCard({ overview, currency, isLoading }: MonthOverviewCardsProps) {
  const { total, previousTotal, previousMonthKey, changeRatio } = overview.expenses;
  const isUp = changeRatio !== null && changeRatio > 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Gastos de este mes</CardDescription>
        {/* Left in the default colour on purpose. The comparison below carries
            the judgement — a red headline every month says nothing. */}
        <CardTitle className="text-2xl">
          {isLoading ? PLACEHOLDER : formatCurrency(total, currency)}
        </CardTitle>
        <CardAction>
          <Wallet className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? null : changeRatio === null ? (
          <p className="text-xs text-muted-foreground">
            {previousTotal === 0
              ? `Sin gastos en ${formatMonthLabel(previousMonthKey)}`
              : "Sin comparación disponible"}
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {isUp ? (
              <TrendingUp className="size-3.5 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <TrendingDown className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>
              <span
                className={cn(
                  "font-medium",
                  isUp
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {formatPercent(Math.abs(changeRatio))} {isUp ? "más" : "menos"}
              </span>{" "}
              que en {formatMonthLabel(previousMonthKey)}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetCard({ overview, currency, isLoading }: MonthOverviewCardsProps) {
  const { budget } = overview;
  const isExceeded = budget !== null && budget.remaining < 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {isExceeded ? "Presupuesto excedido" : "Presupuesto disponible"}
        </CardDescription>
        <CardTitle
          className={cn("text-2xl", isExceeded && "text-red-600 dark:text-red-400")}
        >
          {isLoading || budget === null
            ? PLACEHOLDER
            : formatCurrency(Math.abs(budget.remaining), currency)}
        </CardTitle>
        <CardAction>
          <Target className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? null : budget === null ? (
          <p className="text-xs text-muted-foreground">
            Definí presupuestos para ver cuánto te queda del mes.
          </p>
        ) : (
          <>
            <ProgressBar
              ratio={budget.ratio}
              tone={isExceeded ? "destructive" : "primary"}
            />
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatCurrency(budget.spent, currency)} de{" "}
              {formatCurrency(budget.cap, currency)} · {formatPercent(budget.ratio)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SavingsCard({ overview, currency, isLoading }: MonthOverviewCardsProps) {
  const { savings } = overview;
  const isReached = savings !== null && savings.remaining === 0;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Ahorro</CardDescription>
        <CardTitle className="text-2xl">
          {isLoading || savings === null
            ? PLACEHOLDER
            : formatCurrency(savings.saved, currency)}
        </CardTitle>
        <CardAction>
          <PiggyBank className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? null : savings === null ? (
          <p className="text-xs text-muted-foreground">
            Creá un objetivo en Ahorros para seguir tu progreso.
          </p>
        ) : (
          <>
            <ProgressBar ratio={savings.ratio} tone="primary" />
            <p className="text-xs text-muted-foreground tabular-nums">
              {isReached
                ? `Objetivo alcanzado · ${formatCurrency(savings.target, currency)}`
                : `${formatPercent(savings.ratio)} de ${formatCurrency(
                    savings.target,
                    currency,
                  )} · faltan ${formatCurrency(savings.remaining, currency)}`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// The month at a glance, above the filters and deliberately outside them: these
// three answer "how is this month going" before the user configures anything.
// Only the currency applies, and the heading names the month so the fixed scope
// is stated rather than implied.
export function MonthOverviewCards(props: MonthOverviewCardsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Este mes · {formatMonthLabel(props.overview.monthKey)}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MonthExpensesCard {...props} />
        <BudgetCard {...props} />
        <SavingsCard {...props} />
      </div>
    </section>
  );
}
