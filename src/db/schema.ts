export type TransactionType = "income" | "expense";

export type PaymentMethodType = "bank" | "cash" | "wallet" | "card";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: PaymentMethodType;
  currency: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number | null;
  payment_method_id: number | null;
  description: string;
  date: string;
  currency: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
  payment_method_name: string | null;
}

// The DDL and the default seed data both live in Rust
// (src-tauri/src/lib.rs) as tauri-plugin-sql migrations, run automatically
// and exactly once by the plugin when the connection opens.
