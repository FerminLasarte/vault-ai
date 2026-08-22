import type { InstallmentPlanWithNames } from "@/db/schema";
import { pendingInstallments } from "@/lib/installments";

export interface PendingPlanInstallment {
  plan: InstallmentPlanWithNames;
  index: number;
  number: number;
  date: string;
  amount: number;
}

// Every instalment awaiting confirmation across all plans, oldest first.
export function collectPendingInstallments(
  plans: InstallmentPlanWithNames[],
  today: string,
): PendingPlanInstallment[] {
  const pending: PendingPlanInstallment[] = [];

  for (const plan of plans) {
    for (const entry of pendingInstallments(plan, today)) {
      pending.push({ plan, ...entry });
    }
  }

  return pending.sort((a, b) => a.date.localeCompare(b.date));
}
