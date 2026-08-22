import Database from "@tauri-apps/plugin-sql";
import type {
  Category,
  CategoryType,
  ExchangeRate,
  PaymentMethod,
  PaymentMethodType,
  NewTransaction,
  Transaction,
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

export interface NewCategory {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
}

export async function insertCategory(category: NewCategory): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO categories (name, type, color, icon) VALUES ($1, $2, $3, $4)",
    [category.name, category.type, category.color, category.icon],
  );
}

export async function updateCategory(id: number, category: NewCategory): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE categories SET name = $1, type = $2, color = $3, icon = $4 WHERE id = $5",
    [category.name, category.type, category.color, category.icon, id],
  );
}

// Transactions reference categories with a nullable FK, so deleting a category
// detaches it from its history rather than destroying the records.
export async function deleteCategory(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET category_id = NULL WHERE category_id = $1", [
    id,
  ]);
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
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
  initialBalance: number;
}

export async function insertPaymentMethod(method: NewPaymentMethod): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO payment_methods (name, type, currency, initial_balance)
     VALUES ($1, $2, $3, $4)`,
    [method.name, method.type, method.currency, method.initialBalance],
  );
}

export async function updatePaymentMethod(
  id: number,
  method: NewPaymentMethod,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE payment_methods
     SET name = $1, type = $2, currency = $3, initial_balance = $4
     WHERE id = $5`,
    [method.name, method.type, method.currency, method.initialBalance, id],
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
  await db.execute(
    `UPDATE transactions SET destination_payment_method_id = NULL
     WHERE destination_payment_method_id = $1`,
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
            c.icon AS category_icon,
            p.name AS payment_method_name,
            d.name AS destination_payment_method_name,
            d.currency AS destination_currency
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     LEFT JOIN payment_methods p ON p.id = t.payment_method_id
     LEFT JOIN payment_methods d ON d.id = t.destination_payment_method_id
     ORDER BY t.date DESC, t.id DESC`,
  );
}

export async function insertTransaction(
  transaction: NewTransaction,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO transactions
       (amount, type, category_id, payment_method_id, destination_payment_method_id,
        destination_amount, description, date, currency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      transaction.amount,
      transaction.type,
      transaction.categoryId,
      transaction.paymentMethodId,
      transaction.destinationPaymentMethodId,
      transaction.destinationAmount,
      transaction.description,
      transaction.date,
      transaction.currency,
    ],
  );
}

export async function updateTransaction(
  id: number,
  transaction: NewTransaction,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE transactions
     SET amount = $1,
         type = $2,
         category_id = $3,
         payment_method_id = $4,
         destination_payment_method_id = $5,
         destination_amount = $6,
         description = $7,
         date = $8,
         currency = $9
     WHERE id = $10`,
    [
      transaction.amount,
      transaction.type,
      transaction.categoryId,
      transaction.paymentMethodId,
      transaction.destinationPaymentMethodId,
      transaction.destinationAmount,
      transaction.description,
      transaction.date,
      transaction.currency,
      id,
    ],
  );
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

// Inserts many rows in sequence. Every row has already been validated by the
// import planner, so a mid-way failure is not expected; if one does happen the
// rows before it stay written, which is preferable to silently discarding a
// long import that was almost entirely fine.
export async function insertTransactions(
  transactions: NewTransaction[],
): Promise<void> {
  for (const transaction of transactions) {
    await insertTransaction(transaction);
  }
}

// Folds the write-ahead log back into the main database file. Without this a
// copy of vault-ai.db would miss everything still sitting in the -wal sidecar.
export async function checkpointDatabase(): Promise<void> {
  const db = await getDb();
  await db.execute("PRAGMA wal_checkpoint(TRUNCATE)");
}

// Returns the most recent cached quote, or null when none has ever been
// stored — which is only the case before the first successful fetch.
export async function getLatestExchangeRate(): Promise<ExchangeRate | null> {
  const db = await getDb();
  const rows = await db.select<ExchangeRate[]>(
    "SELECT * FROM exchange_rates ORDER BY date DESC LIMIT 1",
  );
  return rows[0] ?? null;
}

// One row per day: re-fetching on the same day refreshes it in place rather
// than piling up duplicates, and a manual correction overwrites the fetched one.
export async function upsertExchangeRate(rate: ExchangeRate): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO exchange_rates (date, buy, sell, source, fetched_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(date) DO UPDATE SET
       buy = excluded.buy,
       sell = excluded.sell,
       source = excluded.source,
       fetched_at = excluded.fetched_at`,
    [rate.date, rate.buy, rate.sell, rate.source, rate.fetched_at],
  );
}

export * from "./schema";
