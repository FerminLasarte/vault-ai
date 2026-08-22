import { DEFAULT_CURRENCY } from "@/lib/currency";

export function formatCurrency(
  value: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(value);
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Parses a "YYYY-MM-DD" string as a local date. Using `new Date(isoString)`
// instead would parse it as UTC midnight, which shifts to the previous day
// once formatted in negative-UTC-offset timezones.
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(parseIsoDate(isoDate));
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text.charAt(0).toUpperCase() + text.slice(1);
}

// Formats a "YYYY-MM" key as a human month label, e.g. "Julio 2026" (long)
// or "jul 2026" (short, used for compact chart axes).
export function formatMonthLabel(monthKey: string, style: "long" | "short" = "long"): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const formatter = new Intl.DateTimeFormat("es-ES", { month: style, year: "numeric" });
  const label = formatter.format(date);
  return style === "long" ? capitalize(label) : label;
}

const compactFormatter = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Short form for chart axis ticks. A tick has to read at a glance and has very
// little room: "8 mil" carries the magnitude that "8000,00 ARS" buries, and the
// currency is deliberately left off because repeating it on every tick is noise
// the tooltip and the summary cards already cover.
export function formatCompactAmount(value: number): string {
  return compactFormatter.format(value);
}
