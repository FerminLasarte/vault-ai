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
