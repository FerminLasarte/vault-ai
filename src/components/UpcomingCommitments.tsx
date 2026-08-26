import { CalendarClock } from "lucide-react";
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

interface UpcomingCommitmentsProps {
  months: ProjectedMonth[];
  currency: string;
  isLoading: boolean;
}

// What the months ahead already owe.
//
// Hidden entirely when nothing is committed rather than shown as a row of
// zeroes: someone with no instalments, loans or recurring movements is not
// missing a feature, they simply have nothing coming, and a card that says so
// three times is noise.
export function UpcomingCommitments({
  months,
  currency,
  isLoading,
}: UpcomingCommitmentsProps) {
  const hasAny = months.some((month) => month.expenses > 0);
  if (isLoading || !hasAny) return null;

  const figures: Figure[] = months.map((month) => ({
    key: month.monthKey,
    label: formatMonthLabel(month.monthKey),
    value: formatCurrency(month.expenses, currency),
  }));

  return (
    <div className="flex flex-col gap-3">
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
          <FigureBar figures={figures} bare />
        </CardContent>
      </Card>

      {/* Says where the figures come from, because "committed" has to be
          believable to be useful: this is a calendar being read, not a forecast
          being made. */}
      <p className="text-xs text-muted-foreground">
        Cuotas, préstamos y recurrentes que ya tenés cargados. No incluye lo que gastes de
        más.
      </p>
    </div>
  );
}
