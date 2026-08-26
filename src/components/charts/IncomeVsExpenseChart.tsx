import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactAmount, formatCurrency, formatMonthLabel } from "@/lib/format";
import type { MonthlyTrendEntry } from "@/lib/finance";

// A month of the trend, plus whether it has happened yet.
export interface TrendEntry extends MonthlyTrendEntry {
  // True for months that have not arrived: their figures are commitments read
  // off a schedule, not movements that were recorded.
  isProjected?: boolean;
}

interface IncomeVsExpenseChartProps {
  data: TrendEntry[];
  currency: string;
  isLoading: boolean;
}

const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#ef4444";

const tooltipContentStyle: CSSProperties = {
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: "0.8rem",
  padding: "0.5rem 0.75rem",
};

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" };

export function IncomeVsExpenseChart({
  data,
  currency,
  isLoading,
}: IncomeVsExpenseChartProps) {
  const hasData = data.some((entry) => entry.income > 0 || entry.expenses > 0);

  const chartData = data.map((entry) => ({
    month: formatMonthLabel(entry.monthKey, "short"),
    Ingresos: entry.income,
    Gastos: entry.expenses,
    isProjected: entry.isProjected === true,
  }));

  const hasProjection = chartData.some((entry) => entry.isProjected);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos vs. gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground">
            No hay movimientos en los últimos meses.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                width={64}
                tickFormatter={formatCompactAmount}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(value) => formatCurrency(Number(value), currency)}
                contentStyle={tooltipContentStyle}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}
              />
              {/* Same colours, faded: a month that has not happened is the
                  same kind of thing as one that has, only not yet true. A
                  different hue would read as a different measure. */}
              <Bar dataKey="Ingresos" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={INCOME_COLOR}
                    fillOpacity={entry.isProjected ? 0.35 : 1}
                  />
                ))}
              </Bar>
              <Bar dataKey="Gastos" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.month}
                    fill={EXPENSE_COLOR}
                    fillOpacity={entry.isProjected ? 0.35 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {hasProjection && !isLoading && (
          <p className="pt-2 text-xs text-muted-foreground">
            Los meses claros son lo que ya está comprometido: cuotas, préstamos y
            recurrentes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
