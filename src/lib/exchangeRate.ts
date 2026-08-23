import type { ExchangeRate } from "@/db/schema";

// The MEP ("bolsa") rate, which is the one that reflects what a dollar
// actually costs through the legal financial route. dolarapi.com serves it
// publicly with CORS enabled, so the webview can read it directly — no API
// key, no account, and nothing about the user is ever sent.
const MEP_RATE_URL = "https://dolarapi.com/v1/dolares/bolsa";

export const MEP_RATE_SOURCE = "dolarapi:bolsa";
export const MANUAL_RATE_SOURCE = "manual";

// The same provider's historical series, one quote per business day back to
// 2018. Fetched on demand rather than at start-up: it is ~2800 records, which
// is worth downloading once but not on every launch.
const MEP_HISTORY_URL = "https://api.argentinadatos.com/v1/cotizaciones/dolares/bolsa";

const REQUEST_TIMEOUT_MS = 8000;
const HISTORY_TIMEOUT_MS = 30000;

interface DolarApiResponse {
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// `response.json()` is typed `any`, so annotating the result with an interface
// asserts a shape nobody checked — a change at the provider would surface as
// NaN deep inside a conversion instead of as a failed fetch. These guards make
// the parse the place where a bad payload stops.
function isRatePayload(value: unknown): value is DolarApiResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return isValidRate(candidate.compra) && isValidRate(candidate.venta);
}

// Fetches the current MEP rate. Throws on any network, timeout or shape
// problem; callers are expected to fall back to the last cached rate, since
// being offline must never break the app.
export async function fetchMepRate(): Promise<ExchangeRate> {
  const response = await fetch(MEP_RATE_URL, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Exchange rate request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();

  if (!isRatePayload(payload)) {
    throw new Error("Exchange rate response did not contain usable figures");
  }

  // The API timestamps the quote itself; falling back to today keeps the row
  // keyable even if that field ever goes missing.
  const date = (payload.fechaActualizacion ?? "").slice(0, 10) || todayKey();

  return {
    date,
    buy: payload.compra,
    sell: payload.venta,
    source: MEP_RATE_SOURCE,
    fetched_at: new Date().toISOString(),
  };
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DolarApiHistoryEntry {
  compra: number;
  venta: number;
  fecha: string;
}

// Downloads every historical quote. Entries that are malformed are skipped
// rather than failing the whole import: one bad day should not cost the series.
export async function fetchMepRateHistory(): Promise<ExchangeRate[]> {
  const response = await fetch(MEP_HISTORY_URL, {
    signal: AbortSignal.timeout(HISTORY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Exchange rate history request failed: ${response.status}`);
  }

  const payload: unknown = await response.json();
  const fetchedAt = new Date().toISOString();

  if (!Array.isArray(payload)) {
    throw new Error("Exchange rate history response was not a list");
  }

  return (payload as DolarApiHistoryEntry[])
    .filter(
      (entry) =>
        typeof entry.fecha === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(entry.fecha) &&
        isValidRate(entry.compra) &&
        isValidRate(entry.venta),
    )
    .map((entry) => ({
      date: entry.fecha,
      buy: entry.compra,
      sell: entry.venta,
      source: MEP_RATE_SOURCE,
      fetched_at: fetchedAt,
    }));
}
