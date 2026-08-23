import type { SavingsContribution, SavingsGoalWithNames, Transaction } from "@/db/schema";
import { calculateAccountBalances } from "@/lib/finance";
import type { PaymentMethod } from "@/db/schema";

// How far back the pace is measured. Short enough to reflect what the user is
// doing now, long enough that one unusual month does not dominate it.
const PACE_WINDOW_MONTHS = 3;

function monthsBefore(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1 - months, day);
  const paddedMonth = String(date.getMonth() + 1).padStart(2, "0");
  const paddedDay = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${paddedMonth}-${paddedDay}`;
}

function addMonths(isoDate: string, months: number): string {
  return monthsBefore(isoDate, -months);
}

// Net money that moved into one account over a window: income and arriving
// transfers count up, expenses and departing transfers count down. This is what
// "saving" means for an account-tracked goal.
export function netAccountFlow(
  transactions: Transaction[],
  accountId: number,
  fromDate: string,
  toDate: string,
): number {
  let net = 0;

  for (const transaction of transactions) {
    if (transaction.date < fromDate || transaction.date > toDate) continue;

    if (transaction.payment_method_id === accountId) {
      if (transaction.type === "income") net += transaction.amount;
      else net -= transaction.amount;
    }

    if (
      transaction.type === "transfer" &&
      transaction.destination_payment_method_id === accountId
    ) {
      net += transaction.destination_amount ?? transaction.amount;
    }
  }

  return net;
}

export interface SavingsProgress {
  goal: SavingsGoalWithNames;
  current: number;
  remaining: number;
  ratio: number;
  isReached: boolean;
  // Average saved per month over the recent window. Zero when it cannot be
  // established, or when the user has been drawing the balance down.
  monthlyPace: number;
  // Null when the pace cannot support a projection — an honest "unknown" beats
  // a date invented from a pace of zero.
  projectedDate: string | null;
  // Only meaningful when the goal has a deadline.
  requiredMonthlyPace: number | null;
  isOnTrack: boolean | null;
}

export function calculateSavingsProgress(
  goals: SavingsGoalWithNames[],
  context: {
    accounts: PaymentMethod[];
    transactions: Transaction[];
    contributions: SavingsContribution[];
  },
  today: string,
): SavingsProgress[] {
  const balances = calculateAccountBalances(context.accounts, context.transactions);
  const windowStart = monthsBefore(today, PACE_WINDOW_MONTHS);

  return goals.map((goal) => {
    const goalContributions = context.contributions.filter(
      (contribution) => contribution.goal_id === goal.id,
    );

    let current: number;
    let recentSaved: number;

    if (goal.tracking_mode === "account") {
      current =
        goal.payment_method_id === null ? 0 : (balances.get(goal.payment_method_id) ?? 0);
      recentSaved =
        goal.payment_method_id === null
          ? 0
          : netAccountFlow(
              context.transactions,
              goal.payment_method_id,
              windowStart,
              today,
            );
    } else {
      current = goalContributions.reduce(
        (total, contribution) => total + contribution.amount,
        0,
      );
      recentSaved = goalContributions
        .filter(
          (contribution) =>
            contribution.date >= windowStart && contribution.date <= today,
        )
        .reduce((total, contribution) => total + contribution.amount, 0);
    }

    const remaining = goal.target_amount - current;
    const isReached = current >= goal.target_amount;
    // A negative pace means the balance is going the wrong way; reporting it as
    // a pace would imply a projection that does not exist.
    const monthlyPace = Math.max(recentSaved / PACE_WINDOW_MONTHS, 0);

    let projectedDate: string | null = null;
    if (!isReached && monthlyPace > 0) {
      projectedDate = addMonths(today, Math.ceil(remaining / monthlyPace));
    }

    let requiredMonthlyPace: number | null = null;
    let isOnTrack: boolean | null = null;

    if (goal.target_date !== null && !isReached) {
      const monthsLeft = monthsBetween(today, goal.target_date);
      // A deadline already past cannot be met by any pace.
      requiredMonthlyPace = monthsLeft > 0 ? remaining / monthsLeft : Infinity;
      isOnTrack = monthlyPace >= requiredMonthlyPace;
    } else if (isReached) {
      isOnTrack = true;
    }

    return {
      goal,
      current,
      remaining,
      ratio: current / goal.target_amount,
      isReached,
      monthlyPace,
      projectedDate,
      requiredMonthlyPace,
      isOnTrack,
    };
  });
}

// Whole months from one date to another; negative or zero when the second date
// is not in the future.
export function monthsBetween(fromDate: string, toDate: string): number {
  const [fromYear, fromMonth, fromDay] = fromDate.split("-").map(Number);
  const [toYear, toMonth, toDay] = toDate.split("-").map(Number);

  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  if (toDay < fromDay) months -= 1;

  return months;
}
