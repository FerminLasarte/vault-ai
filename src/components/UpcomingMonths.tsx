import { CalendarClock, CalendarDays } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { FigureBar, type Figure } from "@/components/FigureBar";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import type { ProjectedMonth } from "@/lib/projection";

interface UpcomingMonthsProps {
  // What is already owed: instalments, loan payments, recurring movements.
  committed: ProjectedMonth[];
  // What the user says is coming but never signed for.
  expected: ProjectedMonth[];
  currency: string;
  isLoading: boolean;
}

function expenseFigures(months: ProjectedMonth[], currency: string): Figure[] {
  return months.map((month) => ({
    key: month.monthKey,
    label: formatMonthLabel(month.monthKey),
    value: formatCurrency(month.expenses, currency),
    // Expected income rides under its month rather than getting a row of its
    // own: a bonus in December is context for December's cost, and pulling it
    // out into a third bar would triple the furniture to say one thing.
    sub:
      month.income > 0 ? (
        <span className="text-xs text-emerald-600 dark:text-emerald-400">
          +{formatCurrency(month.income, currency)} a favor
        </span>
      ) : undefined,
  }));
}

// What the months ahead look like, in two figures that are deliberately never
// added together.
//
// The upper card is a calendar being read: every figure in it comes from a
// schedule the app derives. The lower one is the user's own word that something
// is coming. Both are worth knowing and only one of them is owed, so they are
// shown as two rows rather than as one total — the moment they are summed, the
// result stops being either.
//
// Each row appears on its own: someone with no instalments but three things
// noted down still has a month worth looking at.
export function UpcomingMonths({
  committed,
  expected,
  currency,
  isLoading,
}: UpcomingMonthsProps) {
  const hasCommitted = committed.some((month) => month.expenses > 0);
  const hasExpected = expected.some((month) => month.expenses > 0 || month.income > 0);

  if (isLoading || (!hasCommitted && !hasExpected)) return null;

  return (
    <div className="flex flex-col gap-3">
      {hasCommitted && (
        <Card>
          <CardHeader>
            <CardDescription>Ya comprometido</CardDescription>
            <CardAction>
              <CalendarClock className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {/* The same row of figures the balance and the period totals use, so
                three numbers side by side always mean the same kind of thing. */}
            <FigureBar figures={expenseFigures(committed, currency)} bare />
          </CardContent>
        </Card>
      )}

      {hasExpected && (
        <Card>
          <CardHeader>
            <CardDescription>Previsto</CardDescription>
            <CardAction>
              <CalendarDays className="size-4 text-muted-foreground" />
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <FigureBar figures={expenseFigures(expected, currency)} bare />
          </CardContent>
        </Card>
      )}

      {/* Says where each figure comes from, because "committed" has to be
          believable to be useful: the first card is a calendar being read, not
          a forecast being made, and the second is explicitly not a promise. */}
      <p className="text-xs text-muted-foreground">
        Comprometido: cuotas, préstamos y recurrentes que ya tenés cargados. Previsto: lo
        que anotaste que se viene y todavía puede no pasar. No incluye lo que gastes de
        más.
      </p>
    </div>
  );
}
