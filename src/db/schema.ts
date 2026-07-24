export type TransactionType = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: TransactionType;
  category_id: number | null;
  payment_method: string;
  description: string;
  date: string;
}

// The DDL and the default-category seed both live in Rust
// (src-tauri/src/lib.rs) as tauri-plugin-sql migrations, run automatically
// and exactly once by the plugin when the connection opens.
