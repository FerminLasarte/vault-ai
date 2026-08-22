import type { ExchangeRate } from "@/db/schema";

// The MEP ("bolsa") rate, which is the one that reflects what a dollar
// actually costs through the legal financial route. dolarapi.com serves it
// publicly with CORS enabled, so the webview can read it directly — no API
// key, no account, and nothing about the user is ever sent.
const MEP_RATE_URL = "https://dolarapi.com/v1/dolares/bolsa";

export const MEP_RATE_SOURCE = "dolarapi:bolsa";
export const MANUAL_RATE_SOURCE = "manual";

const REQUEST_TIMEOUT_MS = 8000;

interface DolarApiResponse {
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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

  const payload: DolarApiResponse = await response.json();

  if (!isValidRate(payload.compra) || !isValidRate(payload.venta)) {
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
