export interface CurrencyOption {
  code: string;
  label: string;
}

export const DEFAULT_CURRENCY = "EUR";

export const CURRENCIES: CurrencyOption[] = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dólar estadounidense ($)" },
  { code: "GBP", label: "Libra esterlina (£)" },
  { code: "MXN", label: "Peso mexicano ($)" },
  { code: "ARS", label: "Peso argentino ($)" },
  { code: "COP", label: "Peso colombiano ($)" },
  { code: "CLP", label: "Peso chileno ($)" },
  { code: "PEN", label: "Sol peruano (S/)" },
];

export const CURRENCY_LABELS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency.label]),
);

// The two currencies the dashboard's global filter can segregate by.
export const DASHBOARD_CURRENCIES = ["ARS", "USD"] as const;

export const DEFAULT_DASHBOARD_CURRENCY: string = "ARS";
