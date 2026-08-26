import { describe, expect, it } from "vitest";
import type { BudgetWithCategory } from "@/db/schema";
import type { BudgetProgress } from "@/lib/finance";
import { buildAttentionItems } from "@/lib/attention";

function makeOverspent(categoryName: string, ratio: number): BudgetProgress {
  const budget = {
    id: Math.random(),
    category_id: 1,
    currency: "ARS",
    amount: 1000,
    period: "monthly",
    category_name: categoryName,
    category_icon: "🍔",
    category_color: "#000000",
  } satisfies BudgetWithCategory;

  return {
    budget,
    spent: budget.amount * ratio,
    remaining: budget.amount - budget.amount * ratio,
    ratio,
    isExceeded: true,
  };
}

const CALM = {
  overspent: [],
  backup: { daysAgo: 1, isOverdue: false },
  pendingCount: 0,
};

describe("buildAttentionItems", () => {
  it("says nothing when there is nothing to say", () => {
    expect(buildAttentionItems(CALM)).toEqual([]);
  });

  it("names the exceeded budgets and how far over they are", () => {
    const [item] = buildAttentionItems({
      ...CALM,
      overspent: [makeOverspent("Comida", 1.8)],
    });

    expect(item).toMatchObject({ kind: "budget", tone: "critical" });
    expect(item.title).toBe("Superaste un presupuesto");
    expect(item.detail).toBe("Comida (180%)");
  });

  it("counts several exceeded budgets and lists them together", () => {
    const [item] = buildAttentionItems({
      ...CALM,
      overspent: [makeOverspent("Comida", 1.2), makeOverspent("Transporte", 1.05)],
    });

    expect(item.title).toBe("Superaste 2 presupuestos");
    expect(item.detail).toBe("Comida (120%) · Transporte (105%)");
  });

  it("distinguishes a stale backup from one that was never taken", () => {
    const [stale] = buildAttentionItems({
      ...CALM,
      backup: { daysAgo: 30, isOverdue: true },
    });
    expect(stale.title).toBe("Hace 30 días que no guardás una copia");

    const [never] = buildAttentionItems({
      ...CALM,
      backup: { daysAgo: null, isOverdue: true },
    });
    expect(never.title).toBe("Nunca guardaste una copia de seguridad");
  });

  it("stays quiet about a backup that is recent enough", () => {
    expect(
      buildAttentionItems({ ...CALM, backup: { daysAgo: 3, isOverdue: false } }),
    ).toEqual([]);
  });

  it("marks pending confirmations as ordinary work rather than a warning", () => {
    const [item] = buildAttentionItems({ ...CALM, pendingCount: 1 });

    expect(item).toMatchObject({ kind: "pending", tone: "neutral" });
    expect(item.title).toBe("Tenés 1 movimiento pendiente de confirmar");
  });

  it("pluralises the pending count", () => {
    const [item] = buildAttentionItems({ ...CALM, pendingCount: 4 });

    expect(item.title).toBe("Tenés 4 movimientos pendientes de confirmar");
  });

  it("orders all three by what it costs to ignore them", () => {
    const items = buildAttentionItems({
      overspent: [makeOverspent("Comida", 1.1)],
      backup: { daysAgo: 30, isOverdue: true },
      pendingCount: 2,
    });

    expect(items.map((item) => item.kind)).toEqual(["budget", "backup", "pending"]);
  });
});
