import Database from "@tauri-apps/plugin-sql";
import type { Category, Transaction, TransactionType } from "./schema";

const DATABASE_URL = "sqlite:vault-ai.db";

let dbPromise: Promise<Database> | null = null;

// Returns a cached connection, opening it (once) on first call. Opening the
// connection is what triggers the Rust-side migrations (see src-tauri/src/lib.rs),
// which create the schema and seed the default categories — so by the time
// this promise resolves, the database is fully ready.
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DATABASE_URL);
  }
  return dbPromise;
}

// Ensures the connection (and thus the Rust migrations) has run. Safe to
// call from multiple components on mount; they all share the same promise.
export function initDatabase(): Promise<Database> {
  return getDb();
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return db.select<Category[]>("SELECT * FROM categories ORDER BY name");
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.select<Transaction[]>(
    "SELECT * FROM transactions ORDER BY date DESC, id DESC",
  );
}

export interface NewTransaction {
  amount: number;
  type: TransactionType;
  categoryId: number;
  paymentMethod: string;
  description: string;
  date: string;
}

export async function insertTransaction(
  transaction: NewTransaction,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO transactions (amount, type, category_id, payment_method, description, date)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      transaction.amount,
      transaction.type,
      transaction.categoryId,
      transaction.paymentMethod,
      transaction.description,
      transaction.date,
    ],
  );
}

const SAMPLE_DESCRIPTIONS = [
  "Supermercado",
  "Cena fuera",
  "Nómina",
  "Suscripción",
  "Gasolina",
  "Transferencia recibida",
  "Compra online",
  "Factura de luz",
];

// Inserts `count` random transactions against existing categories, for quickly
// exercising the schema and the dashboard calculations end to end.
export async function insertRandomTransactions(count = 5): Promise<void> {
  const categories = await listCategories();
  if (categories.length === 0) return;

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.round((Math.random() * 490 + 10) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    await insertTransaction({
      amount,
      type: category.type,
      categoryId: category.id,
      paymentMethod: "cash",
      description:
        SAMPLE_DESCRIPTIONS[Math.floor(Math.random() * SAMPLE_DESCRIPTIONS.length)],
      date: date.toISOString().slice(0, 10),
    });
  }
}

export * from "./schema";
