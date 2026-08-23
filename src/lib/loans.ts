import { occurrenceAt } from "@/lib/recurring";

// Everything about a loan is derived from these five figures. Nothing about the
// schedule is stored, so nothing can disagree with anything else.
export interface LoanTerms {
  principal: number;
  annual_rate: number;
  installment_count: number;
  first_due_date: string;
  confirmed_count: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

// A nominal annual rate divided across twelve payments, which is how a TNA is
// quoted and applied in Argentina — not the effective monthly rate that would
// come from compounding.
export function monthlyRate(annualRate: number): number {
  return annualRate / 100 / 12;
}

// The constant payment of the French system: every instalment is the same
// figure, and what changes across the schedule is how much of it is interest.
//
// A rate of zero would divide by zero in the general formula, and it is not an
// edge case worth avoiding — an interest-free loan between two people is the
// normal use — so it collapses to plain division.
export function frenchPayment(principal: number, rate: number, count: number): number {
  if (count <= 0) return 0;
  if (rate <= 0) return round(principal / count);

  const factor = Math.pow(1 + rate, count);
  return round((principal * rate * factor) / (factor - 1));
}

export interface LoanPayment {
  // Zero-based position in the schedule.
  index: number;
  // Human-facing position, i.e. "3 de 12".
  number: number;
  date: string;
  amount: number;
  interest: number;
  principal: number;
  // What is still owed after this payment.
  balance: number;
}

// The full schedule, payment by payment.
//
// The interest of each period is charged on the balance still outstanding, so
// the early payments are mostly interest and the late ones mostly capital. The
// final payment absorbs whatever rounding has accumulated, which is what makes
// the capital add back up to exactly the principal — the same approach
// installments.ts takes, for the same reason.
export function amortizationSchedule(loan: LoanTerms): LoanPayment[] {
  const { principal, installment_count: count } = loan;
  if (count <= 0 || principal <= 0) return [];

  const rate = monthlyRate(loan.annual_rate);
  const payment = frenchPayment(principal, rate, count);

  const schedule: LoanPayment[] = [];
  let balance = principal;

  for (let index = 0; index < count; index++) {
    const isLast = index === count - 1;

    const interest = round(balance * rate);
    // The last payment settles the balance outright rather than repeating the
    // constant figure, which would leave a few cents owing forever.
    const capital = isLast ? round(balance) : round(payment - interest);
    const amount = isLast ? round(capital + interest) : payment;

    balance = round(balance - capital);

    schedule.push({
      index,
      number: index + 1,
      date: occurrenceAt(loan.first_due_date, "monthly", index),
      amount,
      interest,
      principal: capital,
      // Rounding can leave a balance of -0, which formats as "-0,00".
      balance: balance === 0 ? 0 : balance,
    });
  }

  return schedule;
}

// What is still owed in capital: the principal of every payment not yet
// confirmed. Deliberately excludes future interest, which has not been incurred
// and would not be charged if the loan were settled today.
export function outstandingPrincipal(loan: LoanTerms): number {
  return round(
    amortizationSchedule(loan)
      .slice(loan.confirmed_count)
      .reduce((total, payment) => total + payment.principal, 0),
  );
}

// The interest across the whole loan — what the credit costs on top of the
// money itself.
export function totalInterest(loan: LoanTerms): number {
  return round(
    amortizationSchedule(loan).reduce((total, payment) => total + payment.interest, 0),
  );
}

// Principal plus interest: everything that will change hands.
export function totalCost(loan: LoanTerms): number {
  return round(loan.principal + totalInterest(loan));
}

// Payments that have come due and have not been confirmed yet, oldest first.
export function pendingLoanPayments(loan: LoanTerms, today: string): LoanPayment[] {
  const schedule = amortizationSchedule(loan);
  const pending: LoanPayment[] = [];

  for (let index = loan.confirmed_count; index < schedule.length; index++) {
    // Dates are "YYYY-MM-DD", so string comparison is chronological.
    if (schedule[index].date > today) break;
    pending.push(schedule[index]);
  }

  return pending;
}

// Outstanding capital per currency and per direction, so what is owed and what
// is owed to the user are never added together — a net figure would hide both.
export function outstandingByDirection(
  loans: (LoanTerms & { currency: string; direction: string })[],
): Map<string, Map<string, number>> {
  const totals = new Map<string, Map<string, number>>();

  for (const loan of loans) {
    const outstanding = outstandingPrincipal(loan);
    if (outstanding <= 0) continue;

    const byCurrency = totals.get(loan.direction) ?? new Map<string, number>();
    byCurrency.set(
      loan.currency,
      round((byCurrency.get(loan.currency) ?? 0) + outstanding),
    );
    totals.set(loan.direction, byCurrency);
  }

  return totals;
}
