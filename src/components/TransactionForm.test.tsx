// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { TransactionForm } from "./TransactionForm";
import type { Category, PaymentMethod, TransactionWithCategory } from "@/db";

beforeAll(() => {
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: () => {},
    writable: true,
  });
});

// Deliberately ordered so the category under test is never the first one: the
// bug this guards against always produced the first entry in the list, so a
// fixture that happened to use it would pass either way.
const CATEGORIES: Category[] = [
  { id: 1, name: "Bookit", type: "expense", color: "#000", icon: "📚" },
  { id: 2, name: "Gimnasio", type: "expense", color: "#111", icon: "🏋️" },
  { id: 3, name: "Padel", type: "expense", color: "#222", icon: "🎾" },
  { id: 4, name: "Abuelo", type: "income", color: "#333", icon: "👴" },
  { id: 5, name: "Venta", type: "income", color: "#444", icon: "🏷️" },
];

const ACCOUNTS: PaymentMethod[] = [
  { id: 1, name: "Efectivo ARS", type: "cash", currency: "ARS", initial_balance: 0 },
];

function aTransaction(
  overrides: Partial<TransactionWithCategory> = {},
): TransactionWithCategory {
  return {
    id: 10,
    amount: 50000,
    type: "expense",
    category_id: 3,
    payment_method_id: 1,
    destination_payment_method_id: null,
    destination_amount: null,
    description: "Mensual (abril)",
    date: "2025-05-15",
    currency: "ARS",
    category_name: "Padel",
    category_color: "#222",
    category_icon: "🎾",
    payment_method_name: "Efectivo ARS",
    destination_payment_method_name: null,
    destination_currency: null,
    tag_names: null,
    attachment_count: 0,
    ...overrides,
  };
}

// The option list is rendered into the DOM alongside the trigger, so matching
// on text alone finds the option too. Only the trigger says what is *selected*.
function selectedCategory(container: HTMLElement): string {
  const trigger = container.querySelector("#transaction-category");
  return trigger?.textContent?.trim() ?? "";
}

function renderForm(editing: TransactionWithCategory | null) {
  return render(
    <TransactionForm
      categories={CATEGORIES}
      categoryRules={[]}
      tags={[]}
      paymentMethods={ACCOUNTS}
      defaultCurrency="ARS"
      editing={editing}
      onSubmitTransaction={vi.fn()}
    />,
  );
}

describe("TransactionForm when editing", () => {
  it("shows the category the transaction actually has", () => {
    // The regression: opening a transaction for editing replaced its category
    // with the first one on the list, so saving silently reassigned it.
    const { container } = renderForm(aTransaction());

    expect(selectedCategory(container)).toContain("Padel");
    expect(selectedCategory(container)).not.toContain("Bookit");
  });

  it("shows the right category for an income too", () => {
    // Income reads from a different list, and the stale value it was compared
    // against came from the expense one.
    const { container } = renderForm(
      aTransaction({
        type: "income",
        category_id: 5,
        category_name: "Venta",
        description: "Ropa",
      }),
    );

    expect(selectedCategory(container)).toContain("Venta");
    expect(selectedCategory(container)).not.toContain("Abuelo");
  });

  it("keeps the rest of the transaction intact", () => {
    renderForm(aTransaction());

    expect(screen.getByDisplayValue("Mensual (abril)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("50000")).toBeInTheDocument();
  });

  it("still defaults to a usable category when creating", () => {
    // The repair is what gives a new transaction a sensible starting category;
    // fixing the edit case must not cost that.
    const { container } = renderForm(null);

    expect(selectedCategory(container)).toContain("Bookit");
  });
});
