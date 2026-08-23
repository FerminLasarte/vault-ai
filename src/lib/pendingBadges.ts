import { calculateBudgetProgress } from "@/lib/finance";
import { collectPendingInstallments } from "@/lib/pendingInstallments";
import { collectPendingLoanPayments } from "@/lib/pendingLoans";
import { collectPendingRecurrences } from "@/lib/pendingRecurring";
import { BUDGET_WARNING_RATIO } from "@/lib/notifications";
import type { NotificationSources } from "@/lib/notifications";
import type { View } from "@/components/layout/Sidebar";

export type PendingBadges = Partial<Record<View, number>>;

// How many things each section is waiting on.
//
// The same facts the system notifications are built from, but answering a
// different question: a notification says something happened, a badge says
// where to go. One is easy to miss and the other is always there.
//
// Only the sections that can actually be acted on get a count. Estadísticas
// already spells the whole thing out in a notice of its own, and a badge on a
// screen that is only a summary would send the user nowhere.
export function pendingBadges(
  sources: NotificationSources,
  today: string,
): PendingBadges {
  const badges: PendingBadges = {};

  const recurring = collectPendingRecurrences(sources.recurring, today).length;
  if (recurring > 0) badges.recurring = recurring;

  // Instalment purchases and loans live in the same section, so their counts
  // belong in the same badge.
  const debts =
    collectPendingInstallments(sources.installmentPlans, today).length +
    collectPendingLoanPayments(sources.loans, today).length;
  if (debts > 0) badges.debts = debts;

  const budgets = calculateBudgetProgress(sources.budgets, sources.transactions).filter(
    (progress) => progress.ratio >= BUDGET_WARNING_RATIO,
  ).length;
  if (budgets > 0) badges.budgets = budgets;

  return badges;
}
