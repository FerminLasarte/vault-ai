import { describe, expect, it } from "vitest";
import type { ExpectedMovementWithNames } from "@/db/schema";
import {
  collectPendingExpected,
  collectUpcomingExpected,
  expectedInWindow,
} from "@/lib/expected";

let nextId = 1;

function makeExpected(
  overrides: Partial<ExpectedMovementWithNames> = {},
): ExpectedMovementWithNames {
  return {
    id: nextId++,
    description: "Casamiento",
    amount: 100,
    type: "expense",
    currency: "ARS",
    category_id: null,
    payment_method_id: null,
    due_date: "2026-11-15",
    status: "pending",
    transaction_id: null,
    created_at: "2026-08-01T00:00:00.000Z",
    category_name: null,
    category_icon: null,
    payment_method_name: null,
    ...overrides,
  };
}

describe("collectPendingExpected", () => {
  it("collects what is due today or overdue", () => {
    const movements = [
      makeExpected({ due_date: "2026-08-01", description: "Vencido" }),
      makeExpected({ due_date: "2026-08-22", description: "Hoy" }),
      makeExpected({ due_date: "2026-08-23", description: "Mañana" }),
    ];

    expect(
      collectPendingExpected(movements, "2026-08-22").map((entry) => entry.description),
    ).toEqual(["Vencido", "Hoy"]);
  });

  it("orders by date, oldest first", () => {
    const movements = [
      makeExpected({ due_date: "2026-08-20", description: "Segundo" }),
      makeExpected({ due_date: "2026-08-01", description: "Primero" }),
    ];

    expect(
      collectPendingExpected(movements, "2026-08-22").map((entry) => entry.description),
    ).toEqual(["Primero", "Segundo"]);
  });

  it("leaves a movement pending until it is dealt with", () => {
    // Deliberately long overdue: unlike a recurring series there is nothing to
    // advance past, so it has to keep asking rather than quietly expiring.
    const stale = [makeExpected({ due_date: "2026-01-05" })];
    expect(collectPendingExpected(stale, "2026-08-22")).toHaveLength(1);
  });

  it("ignores movements already confirmed or dismissed", () => {
    const movements = [
      makeExpected({ due_date: "2026-08-01", status: "confirmed" }),
      makeExpected({ due_date: "2026-08-01", status: "dismissed" }),
    ];

    expect(collectPendingExpected(movements, "2026-08-22")).toEqual([]);
  });
});

describe("collectUpcomingExpected", () => {
  it("collects only what is still ahead", () => {
    const movements = [
      makeExpected({ due_date: "2026-08-01", description: "Vencido" }),
      makeExpected({ due_date: "2026-08-22", description: "Hoy" }),
      makeExpected({ due_date: "2026-09-01", description: "Próximo" }),
    ];

    expect(
      collectUpcomingExpected(movements, "2026-08-22").map((entry) => entry.description),
    ).toEqual(["Próximo"]);
  });

  it("ignores movements already closed", () => {
    const movements = [makeExpected({ due_date: "2026-12-01", status: "confirmed" })];
    expect(collectUpcomingExpected(movements, "2026-08-22")).toEqual([]);
  });
});

describe("expectedInWindow", () => {
  const window = { from: "2026-11-01", to: "2026-11-30" };

  it("splits income from expenses", () => {
    const movements = [
      makeExpected({ amount: 300, type: "expense" }),
      makeExpected({ amount: 500, type: "income" }),
    ];

    expect(expectedInWindow(movements, "ARS", window.from, window.to)).toEqual({
      income: 500,
      expenses: 300,
    });
  });

  it("counts only the requested currency", () => {
    const movements = [
      makeExpected({ amount: 300, currency: "ARS" }),
      makeExpected({ amount: 50, currency: "USD" }),
    ];

    expect(expectedInWindow(movements, "ARS", window.from, window.to).expenses).toBe(300);
  });

  it("counts only what falls inside the window", () => {
    const movements = [
      makeExpected({ amount: 300, due_date: "2026-11-15" }),
      makeExpected({ amount: 700, due_date: "2026-12-01" }),
      makeExpected({ amount: 900, due_date: "2026-10-31" }),
    ];

    expect(expectedInWindow(movements, "ARS", window.from, window.to).expenses).toBe(300);
  });

  it("includes the boundary days", () => {
    const movements = [
      makeExpected({ amount: 10, due_date: "2026-11-01" }),
      makeExpected({ amount: 20, due_date: "2026-11-30" }),
    ];

    expect(expectedInWindow(movements, "ARS", window.from, window.to).expenses).toBe(30);
  });

  it("leaves out anything already confirmed, which is a real transaction by now", () => {
    const movements = [
      makeExpected({ amount: 300, status: "confirmed" }),
      makeExpected({ amount: 400, status: "dismissed" }),
    ];

    expect(expectedInWindow(movements, "ARS", window.from, window.to)).toEqual({
      income: 0,
      expenses: 0,
    });
  });

  it("keeps an overdue movement in the month it was due, not the current one", () => {
    const movements = [makeExpected({ amount: 300, due_date: "2026-11-15" })];

    expect(expectedInWindow(movements, "ARS", "2026-12-01", "2026-12-31").expenses).toBe(
      0,
    );
  });
});
