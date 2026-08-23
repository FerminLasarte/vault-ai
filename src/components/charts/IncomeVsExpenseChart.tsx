import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactAmount, formatCurrency, formatMonthLabel } from "@/lib/format";
import type { MonthlyTrendEntry } from "@/lib/finance";

interface IncomeVsExpenseChartProps {
  data: MonthlyTrendEntry[];
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
  }));

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
              <Bar dataKey="Ingresos" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
