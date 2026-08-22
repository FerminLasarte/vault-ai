export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, monthIndex + 1, 0).getDate();
}

function toIso(year: number, monthIndex: number, day: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

// The `index`-th occurrence of a series, counting the start date as index 0.
//
// Always derived from the start date rather than from the previous occurrence.
// Stepping month by month would clamp a series anchored on the 31st down to 28
// in February and then keep it at 28 forever; anchoring on the original day
// means February borrows the last day of the month and March goes back to 31.
export function occurrenceAt(
  startDate: string,
  frequency: RecurrenceFrequency,
  index: number,
): string {
  const [year, month, day] = startDate.split("-").map(Number);
  const startMonthIndex = month - 1;

  if (frequency === "weekly") {
    const date = new Date(year, startMonthIndex, day + index * 7);
    return toIso(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const monthsAhead = frequency === "monthly" ? index : index * 12;
  const absoluteMonth = startMonthIndex + monthsAhead;
  const targetYear = year + Math.floor(absoluteMonth / 12);
  const targetMonth = ((absoluteMonth % 12) + 12) % 12;

  return toIso(
    targetYear,
    targetMonth,
    Math.min(day, daysInMonth(targetYear, targetMonth)),
  );
}

// Occurrences that have come due and not been dealt with yet, oldest first.
//
// `lastConfirmed` is the most recent occurrence the user already accepted or
// dismissed; everything strictly after it and up to `today` is pending. This is
// what lets the app catch up after being closed for two months instead of
// silently losing those periods.
export function pendingOccurrences(
  startDate: string,
  frequency: RecurrenceFrequency,
  lastConfirmed: string | null,
  today: string,
  maxOccurrences = 24,
): string[] {
  const pending: string[] = [];

  for (let index = 0; pending.length < maxOccurrences; index++) {
    const date = occurrenceAt(startDate, frequency, index);

    // Dates are "YYYY-MM-DD", so lexicographic comparison is chronological.
    if (date > today) break;
    if (lastConfirmed === null || date > lastConfirmed) {
      pending.push(date);
    }

    // A guard against a pathological start date far in the past producing an
    // unbounded loop before the date ever reaches today.
    if (index > 10_000) break;
  }

  return pending;
}
