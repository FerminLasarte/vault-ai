import { describe, expect, it } from "vitest";
import {
  amortizationSchedule,
  frenchPayment,
  monthlyRate,
  outstandingByDirection,
  outstandingPrincipal,
  pendingLoanPayments,
  totalCost,
  totalInterest,
} from "./loans";
import type { LoanTerms } from "./loans";

function aLoan(overrides: Partial<LoanTerms> = {}): LoanTerms {
  return {
    principal: 1_000_000,
    annual_rate: 60,
    installment_count: 12,
    first_due_date: "2026-09-10",
    confirmed_count: 0,
    ...overrides,
  };
}

function sum(values: number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}

describe("monthlyRate", () => {
  it("divides the nominal annual rate across twelve payments", () => {
    // A TNA is quoted and applied this way; compounding it would quietly make
    // every loan more expensive than the one the user was offered.
    expect(monthlyRate(60)).toBeCloseTo(0.05, 10);
    expect(monthlyRate(0)).toBe(0);
  });
});

describe("frenchPayment", () => {
  it("splits evenly when there is no interest", () => {
    expect(frenchPayment(1200, 0, 12)).toBe(100);
  });

  it("matches the textbook figure", () => {
    // 100.000 at 1% monthly over 12: the standard worked example.
    expect(frenchPayment(100_000, 0.01, 12)).toBeCloseTo(8884.88, 2);
  });

  it("is the principal itself when there is one interest-free payment", () => {
    expect(frenchPayment(5000, 0, 1)).toBe(5000);
  });
});

describe("amortizationSchedule", () => {
  it("repays exactly the principal, no more and no less", () => {
    // The property that matters most: rounding must not leave the loan owing a
    // few cents forever, nor overpay it.
    const schedule = amortizationSchedule(aLoan());

    expect(schedule).toHaveLength(12);
    expect(sum(schedule.map((payment) => payment.principal))).toBe(1_000_000);
  });

  it("ends at a zero balance", () => {
    const schedule = amortizationSchedule(aLoan());
    expect(schedule[schedule.length - 1].balance).toBe(0);
  });

  it("never shows a negative zero balance", () => {
    // -0 formats as "-0,00", which reads like an error to anyone looking at it.
    const schedule = amortizationSchedule(aLoan({ annual_rate: 37.5 }));
    expect(Object.is(schedule[schedule.length - 1].balance, -0)).toBe(false);
  });

  it("shifts from interest towards capital as it goes", () => {
    const schedule = amortizationSchedule(aLoan());

    const first = schedule[0];
    const last = schedule[schedule.length - 1];

    expect(first.interest).toBeGreaterThan(last.interest);
    expect(first.principal).toBeLessThan(last.principal);
  });

  it("charges the first period's interest on the whole principal", () => {
    const schedule = amortizationSchedule(aLoan());
    // 1.000.000 at 5% monthly.
    expect(schedule[0].interest).toBeCloseTo(50_000, 2);
  });

  it("charges nothing at all when the rate is zero", () => {
    const schedule = amortizationSchedule(
      aLoan({ principal: 1200, annual_rate: 0, installment_count: 12 }),
    );

    expect(schedule.every((payment) => payment.interest === 0)).toBe(true);
    expect(schedule.every((payment) => payment.amount === 100)).toBe(true);
    expect(sum(schedule.map((payment) => payment.principal))).toBe(1200);
  });

  it("splits an amount that does not divide evenly without losing a cent", () => {
    const schedule = amortizationSchedule(
      aLoan({ principal: 100, annual_rate: 0, installment_count: 3 }),
    );

    expect(sum(schedule.map((payment) => payment.principal))).toBe(100);
  });

  it("keeps every payment on the same day of the month", () => {
    const schedule = amortizationSchedule(
      aLoan({ first_due_date: "2026-09-10", installment_count: 3 }),
    );

    expect(schedule.map((payment) => payment.date)).toEqual([
      "2026-09-10",
      "2026-10-10",
      "2026-11-10",
    ]);
  });

  it("survives a due date that not every month has", () => {
    const schedule = amortizationSchedule(
      aLoan({ first_due_date: "2026-01-31", installment_count: 3 }),
    );

    // February has no 31st; the date has to land somewhere real.
    expect(schedule[1].date.startsWith("2026-02-")).toBe(true);
    expect(schedule.map((payment) => payment.date)).toHaveLength(3);
  });

  it("returns nothing for a loan that cannot exist", () => {
    expect(amortizationSchedule(aLoan({ installment_count: 0 }))).toEqual([]);
    expect(amortizationSchedule(aLoan({ principal: 0 }))).toEqual([]);
  });
});

describe("outstanding and cost", () => {
  it("owes the whole principal before anything is paid", () => {
    expect(outstandingPrincipal(aLoan())).toBe(1_000_000);
  });

  it("owes nothing once every payment is confirmed", () => {
    expect(outstandingPrincipal(aLoan({ confirmed_count: 12 }))).toBe(0);
  });

  it("counts only capital as outstanding, not future interest", () => {
    // Settling early does not mean paying interest that was never incurred.
    const loan = aLoan({ confirmed_count: 6 });
    expect(outstandingPrincipal(loan)).toBeLessThan(loan.principal);
    expect(outstandingPrincipal(loan)).toBeGreaterThan(0);
  });

  it("reports the cost of the credit on top of the money", () => {
    const loan = aLoan();
    expect(totalInterest(loan)).toBeGreaterThan(0);
    expect(totalCost(loan)).toBeCloseTo(loan.principal + totalInterest(loan), 2);
  });

  it("costs nothing beyond the principal when interest-free", () => {
    const loan = aLoan({ annual_rate: 0 });
    expect(totalInterest(loan)).toBe(0);
    expect(totalCost(loan)).toBe(loan.principal);
  });
});

describe("pendingLoanPayments", () => {
  it("returns the payments already due and not confirmed", () => {
    const loan = aLoan({ first_due_date: "2026-06-10", installment_count: 12 });

    const pending = pendingLoanPayments(loan, "2026-08-23");

    expect(pending.map((payment) => payment.date)).toEqual([
      "2026-06-10",
      "2026-07-10",
      "2026-08-10",
    ]);
  });

  it("does not propose a payment before its due date", () => {
    const loan = aLoan({ first_due_date: "2026-09-10" });
    expect(pendingLoanPayments(loan, "2026-08-23")).toEqual([]);
  });

  it("skips what has already been confirmed", () => {
    const loan = aLoan({ first_due_date: "2026-06-10", confirmed_count: 2 });

    const pending = pendingLoanPayments(loan, "2026-08-23");

    expect(pending.map((payment) => payment.number)).toEqual([3]);
  });

  it("proposes nothing once the loan is settled", () => {
    const loan = aLoan({ first_due_date: "2020-01-10", confirmed_count: 12 });
    expect(pendingLoanPayments(loan, "2026-08-23")).toEqual([]);
  });
});

describe("outstandingByDirection", () => {
  it("keeps what is owed apart from what is owed to the user", () => {
    const totals = outstandingByDirection([
      { ...aLoan({ principal: 100 }), currency: "ARS", direction: "borrowed" },
      { ...aLoan({ principal: 300 }), currency: "ARS", direction: "lent" },
    ]);

    // Netting these to 200 would hide both facts at once.
    expect(totals.get("borrowed")?.get("ARS")).toBe(100);
    expect(totals.get("lent")?.get("ARS")).toBe(300);
  });

  it("never mixes currencies", () => {
    const totals = outstandingByDirection([
      { ...aLoan({ principal: 100 }), currency: "ARS", direction: "borrowed" },
      { ...aLoan({ principal: 50 }), currency: "USD", direction: "borrowed" },
    ]);

    expect(totals.get("borrowed")?.get("ARS")).toBe(100);
    expect(totals.get("borrowed")?.get("USD")).toBe(50);
  });

  it("leaves out loans that are already settled", () => {
    const totals = outstandingByDirection([
      { ...aLoan({ confirmed_count: 12 }), currency: "ARS", direction: "borrowed" },
    ]);

    expect(totals.get("borrowed")).toBeUndefined();
  });
});
