export interface CurrencyOption {
  code: string;
  label: string;
}

// The app deliberately supports exactly these two currencies. Every currency
// selector, filter and account reads from this single list, so a transaction
// can never be saved in a currency the rest of the app is unable to show —
// which used to hide it from every view permanently.
export const CURRENCIES: CurrencyOption[] = [
  { code: "ARS", label: "Peso argentino ($)" },
  { code: "USD", label: "Dólar estadounidense (US$)" },
];

export const CURRENCY_CODES: string[] = CURRENCIES.map((currency) => currency.code);

export const CURRENCY_LABELS: Record<string, string> = Object.fromEntries(
  CURRENCIES.map((currency) => [currency.code, currency.label]),
);

// How to name a currency where a full label would not fit and the code alone
// would read as jargon — a column heading over a figure that already carries
// its own symbol.
export const CURRENCY_SHORT_LABELS: Record<string, string> = {
  ARS: "En pesos",
  USD: "En dólares",
};

export const DEFAULT_CURRENCY = "ARS";
