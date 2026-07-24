import { describe, expect, it } from "vitest";
import type { Transaction, TransactionWithCategory } from "@/db/schema";
import {
  buildMonthlyTrend,
  calculateSummary,
  currentMonthKey,
  filterByCurrency,
  filterByMonth,
  getRecentMonthKeys,
  groupExpensesByCategory,
  sumByType,
} from "@/lib/finance";

function makeTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    amount: 0,
    type: "expense",
    category_id: null,
    payment_method_id: null,
    description: "",
    date: "2026-01-01",
    currency: "EUR",
    ...overrides,
  };
}

function makeTransactionWithCategory(
  overrides: Partial<TransactionWithCategory>,
): TransactionWithCategory {
  return {
    ...makeTransaction(overrides),
    category_name: null,
    category_color: null,
    payment_method_name: null,
    ...overrides,
  };
}

describe("calculateSummary", () => {
  it("returns zeros for an empty list", () => {
    expect(calculateSummary([])).toEqual({ balance: 0, income: 0, expenses: 0 });
  });

  it("sums income only", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 100 }),
      makeTransaction({ id: 2, type: "income", amount: 50 }),
    ];
    expect(calculateSummary(transactions)).toEqual({
      balance: 150,
      income: 150,
      expenses: 0,
    });
  });

  it("sums expenses only", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "expense", amount: 30 }),
      makeTransaction({ id: 2, type: "expense", amount: 20 }),
    ];
    expect(calculateSummary(transactions)).toEqual({
      balance: -50,
      income: 0,
      expenses: 50,
    });
  });

  it("computes balance as income minus expenses for a mixed list", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 1000 }),
      makeTransaction({ id: 2, type: "expense", amount: 250 }),
      makeTransaction({ id: 3, type: "expense", amount: 150 }),
      makeTransaction({ id: 4, type: "income", amount: 75.5 }),
    ];
    expect(calculateSummary(transactions)).toEqual({
      balance: 675.5,
      income: 1075.5,
      expenses: 400,
    });
  });

  it("handles decimal amounts without accumulating floating point drift beyond cents", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 0.1 }),
      makeTransaction({ id: 2, type: "income", amount: 0.2 }),
    ];
    expect(calculateSummary(transactions).income).toBeCloseTo(0.3, 10);
  });

  it("treats a negative balance correctly when expenses exceed income", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 10 }),
      makeTransaction({ id: 2, type: "expense", amount: 40 }),
    ];
    expect(calculateSummary(transactions).balance).toBe(-30);
  });
});

describe("sumByType", () => {
  it("returns 0 when no transaction matches the type", () => {
    const transactions = [makeTransaction({ type: "expense", amount: 20 })];
    expect(sumByType(transactions, "income")).toBe(0);
  });

  it("ignores transactions of the other type", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 500 }),
      makeTransaction({ id: 2, type: "expense", amount: 500 }),
    ];
    expect(sumByType(transactions, "income")).toBe(500);
    expect(sumByType(transactions, "expense")).toBe(500);
  });
});

describe("currentMonthKey", () => {
  it("formats a reference date as YYYY-MM", () => {
    expect(currentMonthKey(new Date(2026, 6, 24))).toBe("2026-07");
  });

  it("pads single-digit months", () => {
    expect(currentMonthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });
});

describe("filterByMonth", () => {
  it("keeps only transactions whose date falls in the given month", () => {
    const transactions = [
      makeTransaction({ id: 1, date: "2026-07-01" }),
      makeTransaction({ id: 2, date: "2026-07-31" }),
      makeTransaction({ id: 3, date: "2026-06-30" }),
      makeTransaction({ id: 4, date: "2026-08-01" }),
    ];
    const result = filterByMonth(transactions, "2026-07");
    expect(result.map((transaction) => transaction.id)).toEqual([1, 2]);
  });

  it("defaults to the current month when no key is given", () => {
    const transactions = [
      makeTransaction({ id: 1, date: currentMonthKey() + "-15" }),
      makeTransaction({ id: 2, date: "1999-01-01" }),
    ];
    const result = filterByMonth(transactions);
    expect(result.map((transaction) => transaction.id)).toEqual([1]);
  });

  it("returns an empty array when no transaction matches the month", () => {
    const transactions = [makeTransaction({ date: "2026-01-01" })];
    expect(filterByMonth(transactions, "2026-07")).toEqual([]);
  });
});

describe("filterByCurrency", () => {
  it("keeps only transactions in the given currency", () => {
    const transactions = [
      makeTransaction({ id: 1, currency: "ARS" }),
      makeTransaction({ id: 2, currency: "USD" }),
      makeTransaction({ id: 3, currency: "ARS" }),
    ];
    expect(filterByCurrency(transactions, "ARS").map((t) => t.id)).toEqual([1, 3]);
  });

  it("returns an empty array when no transaction matches the currency", () => {
    const transactions = [makeTransaction({ currency: "EUR" })];
    expect(filterByCurrency(transactions, "ARS")).toEqual([]);
  });
});

describe("groupExpensesByCategory", () => {
  it("sums expense amounts per category and ignores income", () => {
    const transactions = [
      makeTransactionWithCategory({
        id: 1,
        type: "expense",
        amount: 30,
        category_id: 1,
        category_name: "Comida",
        category_color: "#f97316",
      }),
      makeTransactionWithCategory({
        id: 2,
        type: "expense",
        amount: 20,
        category_id: 1,
        category_name: "Comida",
        category_color: "#f97316",
      }),
      makeTransactionWithCategory({
        id: 3,
        type: "income",
        amount: 1000,
        category_id: 2,
        category_name: "Salario",
        category_color: "#10b981",
      }),
    ];
    expect(groupExpensesByCategory(transactions)).toEqual([
      { categoryId: 1, name: "Comida", color: "#f97316", total: 50 },
    ]);
  });

  it("sorts categories by total descending", () => {
    const transactions = [
      makeTransactionWithCategory({
        id: 1,
        type: "expense",
        amount: 10,
        category_id: 1,
        category_name: "Ocio",
        category_color: "#a855f7",
      }),
      makeTransactionWithCategory({
        id: 2,
        type: "expense",
        amount: 90,
        category_id: 2,
        category_name: "Transporte",
        category_color: "#3b82f6",
      }),
    ];
    expect(groupExpensesByCategory(transactions).map((entry) => entry.name)).toEqual([
      "Transporte",
      "Ocio",
    ]);
  });

  it("falls back to a neutral label and color for uncategorized expenses", () => {
    const transactions = [
      makeTransactionWithCategory({
        id: 1,
        type: "expense",
        amount: 15,
        category_id: null,
        category_name: null,
        category_color: null,
      }),
    ];
    expect(groupExpensesByCategory(transactions)).toEqual([
      { categoryId: null, name: "Sin categoría", color: "#94a3b8", total: 15 },
    ]);
  });

  it("returns an empty array when there are no expenses", () => {
    const transactions = [
      makeTransactionWithCategory({ id: 1, type: "income", amount: 100 }),
    ];
    expect(groupExpensesByCategory(transactions)).toEqual([]);
  });
});

describe("getRecentMonthKeys", () => {
  it("returns the requested count of months ending at the reference month", () => {
    expect(getRecentMonthKeys(6, "2026-07")).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("crosses year boundaries correctly", () => {
    expect(getRecentMonthKeys(3, "2026-01")).toEqual(["2025-11", "2025-12", "2026-01"]);
  });
});

describe("buildMonthlyTrend", () => {
  it("computes income and expenses for each requested month", () => {
    const transactions = [
      makeTransaction({ id: 1, type: "income", amount: 100, date: "2026-06-01" }),
      makeTransaction({ id: 2, type: "expense", amount: 40, date: "2026-06-15" }),
      makeTransaction({ id: 3, type: "income", amount: 200, date: "2026-07-01" }),
    ];
    expect(buildMonthlyTrend(transactions, ["2026-06", "2026-07"])).toEqual([
      { monthKey: "2026-06", income: 100, expenses: 40 },
      { monthKey: "2026-07", income: 200, expenses: 0 },
    ]);
  });

  it("returns zeros for months with no transactions", () => {
    expect(buildMonthlyTrend([], ["2026-05"])).toEqual([
      { monthKey: "2026-05", income: 0, expenses: 0 },
    ]);
  });
});
