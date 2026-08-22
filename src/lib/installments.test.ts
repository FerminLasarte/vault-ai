import { describe, expect, it } from "vitest";
import {
  installmentAmounts,
  installmentDueDate,
  outstandingAmount,
  outstandingByCurrency,
  pendingInstallments,
} from "@/lib/installments";

describe("installmentAmounts", () => {
  it("splits a total that divides evenly", () => {
    expect(installmentAmounts(1200, 12)).toEqual(Array(12).fill(100));
  });

  it("always adds back up to the total", () => {
    const amounts = installmentAmounts(100, 3);
    expect(amounts.reduce((total, amount) => total + amount, 0)).toBeCloseTo(100, 10);
  });

  it("pushes the rounding remainder into the last instalment", () => {
    expect(installmentAmounts(100, 3)).toEqual([33.33, 33.33, 33.34]);
  });

  it("handles a single instalment", () => {
    expect(installmentAmounts(999.99, 1)).toEqual([999.99]);
  });

  it("handles a large realistic purchase", () => {
    const amounts = installmentAmounts(450000, 7);
    expect(amounts.reduce((total, amount) => total + amount, 0)).toBeCloseTo(450000, 6);
  });

  it("returns nothing for a nonsensical count", () => {
    expect(installmentAmounts(100, 0)).toEqual([]);
  });
});

describe("installmentDueDate", () => {
  it("advances one month per instalment", () => {
    expect(installmentDueDate("2026-08-10", 0)).toBe("2026-08-10");
    expect(installmentDueDate("2026-08-10", 3)).toBe("2026-11-10");
  });

  it("keeps the anchor day across a short month", () => {
    expect(installmentDueDate("2026-01-31", 1)).toBe("2026-02-28");
    expect(installmentDueDate("2026-01-31", 2)).toBe("2026-03-31");
  });
});

describe("pendingInstallments", () => {
  const plan = {
    total_amount: 1200,
    installment_count: 12,
    first_due_date: "2026-06-10",
    confirmed_count: 0,
  };

  it("proposes every instalment already due", () => {
    const pending = pendingInstallments(plan, "2026-08-22");
    expect(pending.map((entry) => entry.date)).toEqual([
      "2026-06-10",
      "2026-07-10",
      "2026-08-10",
    ]);
  });

  it("numbers them the way a person would read them", () => {
    expect(pendingInstallments(plan, "2026-08-22").map((entry) => entry.number)).toEqual([
      1, 2, 3,
    ]);
  });

  it("skips the ones already confirmed", () => {
    const pending = pendingInstallments({ ...plan, confirmed_count: 2 }, "2026-08-22");
    expect(pending.map((entry) => entry.number)).toEqual([3]);
  });

  it("proposes nothing before the first due date", () => {
    expect(pendingInstallments(plan, "2026-05-01")).toEqual([]);
  });

  it("never proposes more than the plan has", () => {
    const short = { ...plan, installment_count: 2 };
    expect(pendingInstallments(short, "2030-01-01")).toHaveLength(2);
  });

  it("proposes nothing once the plan is finished", () => {
    expect(
      pendingInstallments({ ...plan, confirmed_count: 12 }, "2030-01-01"),
    ).toEqual([]);
  });
});

describe("outstandingAmount", () => {
  it("is the whole total before anything is paid", () => {
    expect(
      outstandingAmount({ total_amount: 1200, installment_count: 12, confirmed_count: 0 }),
    ).toBe(1200);
  });

  it("shrinks as instalments are confirmed", () => {
    expect(
      outstandingAmount({ total_amount: 1200, installment_count: 12, confirmed_count: 3 }),
    ).toBe(900);
  });

  it("reaches exactly zero on the last instalment, rounding included", () => {
    expect(
      outstandingAmount({ total_amount: 100, installment_count: 3, confirmed_count: 3 }),
    ).toBe(0);
  });
});

describe("outstandingByCurrency", () => {
  it("groups what is still owed per currency", () => {
    const totals = outstandingByCurrency([
      { currency: "ARS", total_amount: 1200, installment_count: 12, confirmed_count: 3 },
      { currency: "ARS", total_amount: 600, installment_count: 6, confirmed_count: 0 },
      { currency: "USD", total_amount: 300, installment_count: 3, confirmed_count: 1 },
    ]);
    expect(totals.get("ARS")).toBe(1500);
    expect(totals.get("USD")).toBe(200);
  });

  it("leaves out plans that are fully paid", () => {
    const totals = outstandingByCurrency([
      { currency: "ARS", total_amount: 1200, installment_count: 12, confirmed_count: 12 },
    ]);
    expect(totals.size).toBe(0);
  });
});
