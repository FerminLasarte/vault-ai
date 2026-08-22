import type { RecurringTransactionWithNames } from "@/db/schema";
import { pendingOccurrences } from "@/lib/recurring";

export interface PendingRecurrence {
  template: RecurringTransactionWithNames;
  date: string;
}

// Every occurrence waiting for a decision, across all active templates, oldest
// first. Paused templates are skipped entirely rather than quietly piling up a
// backlog to be dumped on the user when they resume.
export function collectPendingRecurrences(
  templates: RecurringTransactionWithNames[],
  today: string,
): PendingRecurrence[] {
  const pending: PendingRecurrence[] = [];

  for (const template of templates) {
    if (template.is_active !== 1) continue;

    for (const date of pendingOccurrences(
      template.start_date,
      template.frequency,
      template.last_confirmed_date,
      today,
    )) {
      pending.push({ template, date });
    }
  }

  return pending.sort((a, b) => a.date.localeCompare(b.date));
}
