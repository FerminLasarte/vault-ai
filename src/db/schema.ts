import type { RecurrenceFrequency } from "@/lib/recurring";

export type RecurrenceFrequencyValue = RecurrenceFrequency;

// Categories only ever classify money coming in or going out. Transfers move
// money between the user's own accounts, so they are a transaction type but
// never a category type — keeping the two aliases apart stops "Transferencia"
// from leaking into the category forms.
export type CategoryType = "income" | "expense";

export type TransactionType = CategoryType | "transfer";

export type PaymentMethodType = "bank" | "cash" | "wallet" | "card" | "other";

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: PaymentMethodType;
  currency: string;
  // Opening balance the account had before any transaction was recorded in
  // the app. The displayed balance is this figure plus every movement since.
  initial_balance: number;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number | null;
  payment_method_id: number | null;
  // Both only apply to transfers. `destination_amount` is what actually lands
  // in the destination account, which differs from `amount` when the two
  // accounts hold different currencies (e.g. $145.000 out, US$100 in).
  destination_payment_method_id: number | null;
  destination_amount: number | null;
  description: string;
  date: string;
  currency: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  payment_method_name: string | null;
  destination_payment_method_name: string | null;
  destination_currency: string | null;
  // Comma-separated because the listing aggregates them in SQL. Tag names are
  // validated to exclude commas precisely so this stays unambiguous; use
  // `splitTagNames` rather than reading it directly.
  tag_names: string | null;
  attachment_count: number;
}

export type SavingsTrackingMode = "account" | "contributions";

// A savings target. `tracking_mode` decides where progress comes from: the
// balance of a linked account, or contributions the user records by hand.
export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  currency: string;
  tracking_mode: SavingsTrackingMode;
  payment_method_id: number | null;
  // Optional deadline. When set, the projection can say whether the current
  // pace is enough to make it.
  target_date: string | null;
  created_at: string;
}

export interface SavingsGoalWithNames extends SavingsGoal {
  payment_method_name: string | null;
}

export interface SavingsContribution {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string | null;
}

// A purchase split into monthly instalments. Only `confirmed_count` is stored;
// the individual amounts, due dates and outstanding balance are all derived
// from it (see src/lib/installments.ts), so nothing can fall out of sync.
export interface InstallmentPlan {
  id: number;
  description: string;
  total_amount: number;
  installment_count: number;
  currency: string;
  category_id: number | null;
  payment_method_id: number | null;
  first_due_date: string;
  confirmed_count: number;
  created_at: string;
}

export interface InstallmentPlanWithNames extends InstallmentPlan {
  category_name: string | null;
  category_icon: string | null;
  payment_method_name: string | null;
}

// A movement that repeats. Deliberately not a transaction: it only ever
// produces proposals, which the user confirms before anything is recorded.
export interface RecurringTransaction {
  id: number;
  description: string;
  amount: number;
  type: CategoryType;
  category_id: number | null;
  payment_method_id: number | null;
  currency: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  last_confirmed_date: string | null;
  // SQLite has no boolean; 0 or 1.
  is_active: number;
}

export interface RecurringTransactionWithNames extends RecurringTransaction {
  category_name: string | null;
  category_icon: string | null;
  payment_method_name: string | null;
}

export type BudgetPeriod = "monthly" | "annual";

// A spending cap for one category, in one currency, over one period.
export interface Budget {
  id: number;
  category_id: number;
  currency: string;
  amount: number;
  period: BudgetPeriod;
}

export interface BudgetWithCategory extends Budget {
  category_name: string;
  category_icon: string;
  category_color: string;
}

// Metadata only. The content is fetched separately and on demand: holding
// every receipt in memory alongside the transaction list would be wasteful for
// something the user looks at once in a while.
export interface AttachmentMeta {
  id: number;
  transaction_id: number;
  file_name: string;
  mime_type: string;
  byte_size: number;
  created_at: string;
}

export interface Tag {
  id: number;
  name: string;
}

// The DDL and the default seed data both live in Rust
// (src-tauri/src/lib.rs) as tauri-plugin-sql migrations, run automatically
// and exactly once by the plugin when the connection opens.

export interface NewTransaction {
  amount: number;
  type: TransactionType;
  // Null for transfers, which are movements between the user's own accounts
  // and therefore belong to no spending category.
  categoryId: number | null;
  paymentMethodId: number | null;
  // Both only set for transfers. See the note on `Transaction` in ./schema.
  destinationPaymentMethodId: number | null;
  destinationAmount: number | null;
  description: string;
  date: string;
  currency: string;
}

// Maps a piece of description text to a category, so descriptions that repeat
// month after month stop needing to be classified by hand.
export interface CategoryRule {
  id: number;
  pattern: string;
  category_id: number;
}

export interface CategoryRuleWithCategory extends CategoryRule {
  category_name: string;
  category_icon: string;
  category_type: CategoryType;
}

// One cached quote per day. `sell` is what a dollar costs to buy, and is the
// figure used for conversions; `buy` is kept for reference and for a future
// view that needs the spread.
export interface ExchangeRate {
  date: string;
  buy: number;
  sell: number;
  source: string;
  fetched_at: string;
}
