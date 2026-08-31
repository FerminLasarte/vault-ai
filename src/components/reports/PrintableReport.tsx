import {
  CELL,
  NUMBER,
  PrintableDocument,
  Section,
  Table,
} from "@/components/reports/primitives";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { CURRENCY_LABELS } from "@/lib/currency";
import type { Report } from "@/lib/report";

interface PrintableReportProps {
  report: Report;
}

// Whatever the analysis screen is currently filtered to, on paper.
export function PrintableReport({ report }: PrintableReportProps) {
  const { filters, summary } = report;

  const period =
    filters.dateRange.from || filters.dateRange.to
      ? `${filters.dateRange.from ? formatDate(filters.dateRange.from) : "el inicio"} — ${
          filters.dateRange.to ? formatDate(filters.dateRange.to) : "hoy"
        }`
      : "Todo el historial";

  return (
    <PrintableDocument
      title="Vault · Informe"
      generatedAt={report.generatedAt}
      meta={
        <>
          <p className="mt-1 text-xs">
            {period} · {CURRENCY_LABELS[filters.currency] ?? filters.currency}
            {report.categoryName !== null && ` · ${report.categoryName}`}
          </p>
          <p className="text-xs">
            {report.transactionCount}{" "}
            {report.transactionCount === 1 ? "movimiento" : "movimientos"}
          </p>
        </>
      }
    >
      <Section title="Resumen">
        <Table>
          <tbody>
            <tr>
              <td className={CELL}>Ingresos</td>
              <td className={NUMBER}>
                {formatCurrency(summary.income, filters.currency)}
              </td>
            </tr>
            <tr>
              <td className={CELL}>Gastos</td>
              <td className={NUMBER}>
                {formatCurrency(summary.expenses, filters.currency)}
              </td>
            </tr>
            <tr>
              <td className={`${CELL} font-semibold`}>Balance</td>
              <td className={`${NUMBER} font-semibold`}>
                {formatCurrency(summary.balance, filters.currency)}
              </td>
            </tr>
          </tbody>
        </Table>
      </Section>

      {report.byCategory.length > 0 && (
        <Section title="Gastos por categoría">
          <Table>
            <tbody>
              {report.byCategory.map((entry) => (
                <tr key={entry.categoryId ?? "none"}>
                  <td className={CELL}>{entry.name}</td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.total, filters.currency)}
                  </td>
                  <td className={`${NUMBER} w-16`}>
                    {summary.expenses > 0
                      ? formatPercent(entry.total / summary.expenses)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}

      {report.monthly.length > 0 && (
        <Section title="Mes a mes">
          <Table>
            <thead>
              <tr>
                <th className={CELL}>Mes</th>
                <th className={NUMBER}>Ingresos</th>
                <th className={NUMBER}>Gastos</th>
                <th className={NUMBER}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.monthly.map((entry) => (
                <tr key={entry.monthKey}>
                  <td className={CELL}>{entry.monthKey}</td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.income, filters.currency)}
                  </td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.expenses, filters.currency)}
                  </td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.income - entry.expenses, filters.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}

      {report.budgets.length > 0 && (
        <Section title="Presupuestos del período">
          <Table>
            <thead>
              <tr>
                <th className={CELL}>Categoría</th>
                <th className={NUMBER}>Gastado</th>
                <th className={NUMBER}>Tope</th>
                <th className={NUMBER}>Uso</th>
              </tr>
            </thead>
            <tbody>
              {report.budgets.map((entry) => (
                <tr key={entry.budget.id}>
                  <td className={CELL}>
                    {entry.budget.category_name}
                    {entry.isExceeded && " (excedido)"}
                  </td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.spent, entry.budget.currency)}
                  </td>
                  <td className={NUMBER}>
                    {formatCurrency(entry.budget.amount, entry.budget.currency)}
                  </td>
                  <td className={NUMBER}>{formatPercent(entry.ratio)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}
    </PrintableDocument>
  );
}
