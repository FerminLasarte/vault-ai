import Database from "@tauri-apps/plugin-sql";
import { DASHBOARD_CURRENCIES } from "@/lib/currency";
import type {
  Category,
  PaymentMethod,
  PaymentMethodType,
  Transaction,
  TransactionType,
  TransactionWithCategory,
} from "./schema";

const DATABASE_URL = "sqlite:vault-ai.db";

let dbPromise: Promise<Database> | null = null;

// Returns a cached connection, opening it (once) on first call. Opening the
// connection is what triggers the Rust-side migrations (see src-tauri/src/lib.rs),
// which create the schema and seed the default data — so by the time
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

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const db = await getDb();
  return db.select<PaymentMethod[]>(
    "SELECT * FROM payment_methods ORDER BY currency, name",
  );
}

export interface NewPaymentMethod {
  name: string;
  type: PaymentMethodType;
  currency: string;
}

export async function insertPaymentMethod(method: NewPaymentMethod): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO payment_methods (name, type, currency) VALUES ($1, $2, $3)",
    [method.name, method.type, method.currency],
  );
}

export async function updatePaymentMethod(
  id: number,
  method: NewPaymentMethod,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE payment_methods SET name = $1, type = $2, currency = $3 WHERE id = $4",
    [method.name, method.type, method.currency, id],
  );
}

// Transactions reference payment methods with a nullable FK, so deleting an
// account detaches it from its history rather than destroying the records.
export async function deletePaymentMethod(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE transactions SET payment_method_id = NULL WHERE payment_method_id = $1",
    [id],
  );
  await db.execute("DELETE FROM payment_methods WHERE id = $1", [id]);
}

export async function countTransactionsForPaymentMethod(id: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ total: number }[]>(
    "SELECT COUNT(*) AS total FROM transactions WHERE payment_method_id = $1",
    [id],
  );
  return rows[0]?.total ?? 0;
}

export async function listTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return db.select<Transaction[]>(
    "SELECT * FROM transactions ORDER BY date DESC, id DESC",
  );
}

// Joins the category and payment method names in SQL so the UI never has to
// display a raw id or look them up client-side.
export async function listTransactionsWithCategory(): Promise<
  TransactionWithCategory[]
> {
  const db = await getDb();
  return db.select<TransactionWithCategory[]>(
    `SELECT t.*,
            c.name AS category_name,
            c.color AS category_color,
            p.name AS payment_method_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN payment_methods p ON p.id = t.payment_method_id
     ORDER BY t.date DESC, t.id DESC`,
  );
}

export interface NewTransaction {
  amount: number;
  type: TransactionType;
  categoryId: number;
  paymentMethodId: number | null;
  description: string;
  date: string;
  currency: string;
}

export async function insertTransaction(
  transaction: NewTransaction,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO transactions (amount, type, category_id, payment_method_id, description, date, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      transaction.amount,
      transaction.type,
      transaction.categoryId,
      transaction.paymentMethodId,
      transaction.description,
      transaction.date,
      transaction.currency,
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
  const [categories, paymentMethods] = await Promise.all([
    listCategories(),
    listPaymentMethods(),
  ]);
  if (categories.length === 0) return;

  for (let i = 0; i < count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.round((Math.random() * 490 + 10) * 100) / 100;
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    const currency =
      DASHBOARD_CURRENCIES[Math.floor(Math.random() * DASHBOARD_CURRENCIES.length)];
    const matchingMethods = paymentMethods.filter(
      (method) => method.currency === currency,
    );
    const paymentMethod =
      matchingMethods[Math.floor(Math.random() * matchingMethods.length)];

    await insertTransaction({
      amount,
      type: category.type,
      categoryId: category.id,
      paymentMethodId: paymentMethod?.id ?? null,
      description:
        SAMPLE_DESCRIPTIONS[Math.floor(Math.random() * SAMPLE_DESCRIPTIONS.length)],
      date: date.toISOString().slice(0, 10),
      currency,
    });
  }
}

export * from "./schema";
