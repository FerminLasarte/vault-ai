import { calculateBudgetProgress, budgetPeriodKey } from "@/lib/finance";
import { collectPendingInstallments } from "@/lib/pendingInstallments";
import { collectPendingLoanPayments } from "@/lib/pendingLoans";
import { collectPendingRecurrences } from "@/lib/pendingRecurring";
import { formatCurrency, formatDate, parseIsoDate } from "@/lib/format";
import type {
  BudgetWithCategory,
  InstallmentPlanWithNames,
  LoanWithNames,
  RecurringTransactionWithNames,
  Transaction,
} from "@/db/schema";

// The share of a budget that counts as "worth a warning". Below it the user is
// simply spending; above it the month is likely to end over the cap.
export const BUDGET_WARNING_RATIO = 0.8;

export interface AppNotification {
  // Identifies the *fact*, not the moment it was noticed: the same overdue
  // instalment produces the same id on every check, which is what stops it
  // being announced again on every launch. It has to include the period or the
  // instalment number, so next month's occurrence is a different fact.
  id: string;
  title: string;
  body: string;
}

export interface NotificationSources {
  installmentPlans: InstallmentPlanWithNames[];
  loans: LoanWithNames[];
  recurring: RecurringTransactionWithNames[];
  budgets: BudgetWithCategory[];
  transactions: Transaction[];
}

// Everything worth telling the user about right now, regardless of whether it
// has already been told. Pure, so the decision of *what* is notable can be
// tested without an operating system anywhere near it.
export function pendingNotifications(
  sources: NotificationSources,
  today: string,
): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const entry of collectPendingInstallments(sources.installmentPlans, today)) {
    notifications.push({
      id: `installment:${entry.plan.id}:${entry.index}`,
      title: "Cuota vencida",
      body: `${entry.plan.description} · cuota ${entry.number} de ${entry.plan.installment_count} · ${formatCurrency(
        entry.amount,
        entry.plan.currency,
      )} · venció el ${formatDate(entry.date)}`,
    });
  }

  for (const entry of collectPendingLoanPayments(sources.loans, today)) {
    const owed = entry.loan.direction === "borrowed";
    notifications.push({
      id: `loan:${entry.loan.id}:${entry.index}`,
      // A payment on money owed *to* the user is a collection, not a bill, and
      // calling both "cuota vencida" would read as a debt they do not have.
      title: owed ? "Cuota de préstamo vencida" : "Cobro pendiente",
      body: `${entry.loan.description} · ${owed ? "a" : "de"} ${entry.loan.counterparty} · cuota ${entry.number} de ${entry.loan.installment_count} · ${formatCurrency(
        entry.amount,
        entry.loan.currency,
      )}`,
    });
  }

  for (const entry of collectPendingRecurrences(sources.recurring, today)) {
    notifications.push({
      id: `recurring:${entry.template.id}:${entry.date}`,
      title: "Movimiento recurrente pendiente",
      body: `${entry.template.description} · ${formatCurrency(
        entry.template.amount,
        entry.template.currency,
      )} · ${formatDate(entry.date)}`,
    });
  }

  const reference = parseIsoDate(today);
  for (const progress of calculateBudgetProgress(
    sources.budgets,
    sources.transactions,
    reference,
  )) {
    if (progress.ratio < BUDGET_WARNING_RATIO) continue;

    // The period belongs in the id: August's warning and September's are
    // different facts about the same budget, and only the second should be
    // announced once August is over.
    const period = budgetPeriodKey(progress.budget.period, reference);
    const percent = Math.round(progress.ratio * 100);

    notifications.push({
      id: `budget:${progress.budget.id}:${period}:${progress.isExceeded ? "over" : "warn"}`,
      title: progress.isExceeded ? "Presupuesto excedido" : "Presupuesto al límite",
      body: `${progress.budget.category_name} · ${percent}% de ${formatCurrency(
        progress.budget.amount,
        progress.budget.currency,
      )}`,
    });
  }

  return notifications;
}

export interface NotificationDecision {
  // What to announce now: pending, minus whatever was already announced.
  toSend: AppNotification[];
  // What to remember as announced. Deliberately only the ids that are *still*
  // pending: an instalment that has been paid drops out, so if a later one
  // comes due it is announced rather than being mistaken for old news, and the
  // stored set never grows without bound.
  nextSeen: string[];
}

export function decideNotifications(
  pending: AppNotification[],
  alreadySeen: readonly string[],
): NotificationDecision {
  const seen = new Set(alreadySeen);

  return {
    toSend: pending.filter((notification) => !seen.has(notification.id)),
    nextSeen: pending.map((notification) => notification.id),
  };
}
