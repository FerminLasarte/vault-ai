use std::fs;
use std::path::PathBuf;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

// File I/O lives in Rust rather than behind the fs plugin: the plugin scopes
// every path up front, which for a "save wherever you like" export would mean
// granting the webview blanket access to the user's home directory. These
// commands only ever touch the exact path the user picked in the native dialog.
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|error| error.to_string())
}

// Copies the live SQLite file. The WAL is checkpointed by the caller first, so
// what lands on disk is a complete database rather than a stale main file.
#[tauri::command]
fn backup_database(app: tauri::AppHandle, destination: String) -> Result<(), String> {
    let source: PathBuf = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("vault-ai.db");

    fs::copy(&source, &destination)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

// Run automatically by the SQL plugin the moment the frontend opens the
// connection (`Database.load`), before that call resolves — so the schema
// is guaranteed to exist by the time any query runs, regardless of when or
// how many times the frontend's own init code executes.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_categories_table",
            sql: "
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                    color TEXT NOT NULL,
                    icon TEXT NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_transactions_table",
            sql: "
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                    category_id INTEGER REFERENCES categories(id),
                    payment_method TEXT NOT NULL,
                    description TEXT,
                    date TEXT NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        // Runs exactly once (tracked by sqlx in _sqlx_migrations), so the
        // transaction form always has a category to attach to on first launch.
        Migration {
            version: 3,
            description: "seed_default_categories",
            sql: "
                INSERT INTO categories (name, type, color, icon) VALUES
                    ('Salario', 'income', '#10b981', 'wallet'),
                    ('Freelance', 'income', '#06b6d4', 'briefcase'),
                    ('Comida', 'expense', '#f97316', 'utensils'),
                    ('Transporte', 'expense', '#3b82f6', 'car'),
                    ('Ocio', 'expense', '#a855f7', 'popcorn'),
                    ('Otros', 'expense', '#64748b', 'more-horizontal');
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_currency_to_transactions",
            sql: "
                ALTER TABLE transactions ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_payment_methods_table",
            sql: "
                CREATE TABLE IF NOT EXISTS payment_methods (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'wallet', 'card')),
                    currency TEXT NOT NULL
                );

                INSERT INTO payment_methods (name, type, currency) VALUES
                    ('Efectivo ARS', 'cash', 'ARS'),
                    ('Efectivo USD', 'cash', 'USD'),
                    ('Mercado Pago', 'wallet', 'ARS'),
                    ('Cuenta Bancaria ARS', 'bank', 'ARS'),
                    ('Cuenta Bancaria USD', 'bank', 'USD');
            ",
            kind: MigrationKind::Up,
        },
        // SQLite cannot drop or retype a column in place on older versions, so
        // the table is rebuilt. Legacy free-text payment methods are matched
        // back to the seeded rows by name where possible; anything unmatched
        // becomes NULL rather than blocking the migration.
        Migration {
            version: 6,
            description: "link_transactions_to_payment_methods",
            sql: "
                CREATE TABLE transactions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
                    category_id INTEGER REFERENCES categories(id),
                    payment_method_id INTEGER REFERENCES payment_methods(id),
                    description TEXT,
                    date TEXT NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'ARS'
                );

                INSERT INTO transactions_new
                    (id, amount, type, category_id, payment_method_id, description, date, currency)
                SELECT
                    t.id,
                    t.amount,
                    t.type,
                    t.category_id,
                    (SELECT p.id FROM payment_methods p
                      WHERE p.currency = t.currency
                        AND ((t.payment_method = 'cash' AND p.type = 'cash')
                          OR (t.payment_method = 'mercado_pago' AND p.name = 'Mercado Pago')
                          OR (t.payment_method = 'bank_transfer' AND p.type = 'bank'))
                      LIMIT 1),
                    t.description,
                    t.date,
                    t.currency
                FROM transactions t;

                DROP TABLE transactions;
                ALTER TABLE transactions_new RENAME TO transactions;
            ",
            kind: MigrationKind::Up,
        },
        // The `icon` column originally held lucide icon names. Categories are
        // now labelled with a user-chosen emoji, so the existing seeds are
        // translated in place and the column keeps serving the same purpose.
        Migration {
            version: 7,
            description: "convert_category_icons_to_emoji",
            sql: "
                UPDATE categories SET icon = '💼' WHERE icon = 'briefcase';
                UPDATE categories SET icon = '💰' WHERE icon = 'wallet';
                UPDATE categories SET icon = '🍽️' WHERE icon = 'utensils';
                UPDATE categories SET icon = '🚗' WHERE icon = 'car';
                UPDATE categories SET icon = '🍿' WHERE icon = 'popcorn';
                UPDATE categories SET icon = '📦' WHERE icon = 'more-horizontal';
                UPDATE categories SET icon = '🏷️'
                    WHERE icon IS NULL OR icon = '' OR icon GLOB '*[a-zA-Z-]*';
            ",
            kind: MigrationKind::Up,
        },
        // The app now supports exactly two currencies (see src/lib/currency.ts).
        // Rows saved under any other code — notably the 'EUR' default that
        // migration 4 introduced — were still stored but no longer reachable by
        // any filter, so they had silently disappeared from every view. They are
        // reassigned to ARS: the amounts are kept verbatim, since re-valuing
        // historical figures without a rate for their date would invent data.
        Migration {
            version: 8,
            description: "normalize_unsupported_currencies",
            sql: "
                UPDATE transactions SET currency = 'ARS'
                    WHERE currency NOT IN ('ARS', 'USD');
                UPDATE payment_methods SET currency = 'ARS'
                    WHERE currency NOT IN ('ARS', 'USD');
            ",
            kind: MigrationKind::Up,
        },
        // Accounts previously had no balance at all, so the Accounts view could
        // not answer "how much do I have here?". Existing rows default to 0,
        // which means their balance starts out as the sum of whatever movements
        // are already recorded — the user sets the real opening figure by hand.
        Migration {
            version: 9,
            description: "add_initial_balance_to_payment_methods",
            sql: "
                ALTER TABLE payment_methods
                    ADD COLUMN initial_balance REAL NOT NULL DEFAULT 0;
            ",
            kind: MigrationKind::Up,
        },
        // Transfers between the user's own accounts are neither income nor
        // expense: counting them as either would double the totals and distort
        // every chart. They get their own type, plus a destination account and
        // a destination amount — the latter lets a transfer cross currencies
        // (pesos out, dollars in) by recording both legs verbatim, with no
        // exchange rate involved. The table is rebuilt because SQLite cannot
        // widen an existing CHECK constraint in place.
        Migration {
            version: 10,
            description: "add_transfers_to_transactions",
            sql: "
                CREATE TABLE transactions_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
                    category_id INTEGER REFERENCES categories(id),
                    payment_method_id INTEGER REFERENCES payment_methods(id),
                    destination_payment_method_id INTEGER REFERENCES payment_methods(id),
                    destination_amount REAL,
                    description TEXT,
                    date TEXT NOT NULL,
                    currency TEXT NOT NULL DEFAULT 'ARS'
                );

                INSERT INTO transactions_new
                    (id, amount, type, category_id, payment_method_id, description, date, currency)
                SELECT id, amount, type, category_id, payment_method_id, description, date, currency
                FROM transactions;

                DROP TABLE transactions;
                ALTER TABLE transactions_new RENAME TO transactions;
            ",
            kind: MigrationKind::Up,
        },
        // Cached exchange rates, one row per day. The app fetches the current
        // rate online but always persists it here, so conversions keep working
        // offline with the last known figure instead of failing outright — and
        // so a past movement can eventually be valued at its own date's rate.
        Migration {
            version: 11,
            description: "create_exchange_rates_table",
            sql: "
                CREATE TABLE IF NOT EXISTS exchange_rates (
                    date TEXT PRIMARY KEY,
                    buy REAL NOT NULL,
                    sell REAL NOT NULL,
                    source TEXT NOT NULL,
                    fetched_at TEXT NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        // A placeholder account for orphaned history cannot honestly claim to be
        // cash or a bank, and the CHECK constraint admitted nothing else, so the
        // table has to be rebuilt — SQLite cannot widen a CHECK in place.
        //
        // Unlike the earlier rebuilds, this one replaces a table that other rows
        // point AT. With foreign keys enforced (which is sqlx's default, and the
        // reason a plain sqlite3 run of this migration is misleading), dropping
        // it fails outright, and `defer_foreign_keys` only moves the same failure
        // to COMMIT because a schema change never clears the violation counter.
        // So the references are parked, the table is swapped while nothing points
        // at it, and then they are put back — all inside the one transaction the
        // migration runs in, so a failure anywhere rolls the whole thing back.
        Migration {
            version: 12,
            description: "add_other_payment_method_type",
            sql: "
                CREATE TEMP TABLE parked_refs AS
                    SELECT id, payment_method_id, destination_payment_method_id
                    FROM transactions;

                UPDATE transactions
                    SET payment_method_id = NULL,
                        destination_payment_method_id = NULL;

                CREATE TABLE payment_methods_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'wallet', 'card', 'other')),
                    currency TEXT NOT NULL,
                    initial_balance REAL NOT NULL DEFAULT 0
                );

                INSERT INTO payment_methods_new (id, name, type, currency, initial_balance)
                SELECT id, name, type, currency, initial_balance FROM payment_methods;

                DROP TABLE payment_methods;
                ALTER TABLE payment_methods_new RENAME TO payment_methods;

                UPDATE transactions SET
                    payment_method_id = (
                        SELECT p.payment_method_id FROM parked_refs p
                        WHERE p.id = transactions.id
                    ),
                    destination_payment_method_id = (
                        SELECT p.destination_payment_method_id FROM parked_refs p
                        WHERE p.id = transactions.id
                    );

                DROP TABLE parked_refs;
            ",
            kind: MigrationKind::Up,
        },
        // Transactions recorded before accounts existed were left unattached by
        // migration 6, so they contributed to no balance at all. They are moved
        // onto a per-currency placeholder rather than onto a real account, which
        // would credit money to somewhere it never passed through. The accounts
        // are only created when there is actually something to put in them, so a
        // fresh install does not inherit two empty placeholders.
        Migration {
            version: 13,
            description: "attach_orphan_transactions_to_placeholder_accounts",
            sql: "
                INSERT INTO payment_methods (name, type, currency, initial_balance)
                SELECT 'Sin asignar (ARS)', 'other', 'ARS', 0
                WHERE EXISTS (
                    SELECT 1 FROM transactions
                    WHERE payment_method_id IS NULL AND currency = 'ARS'
                );

                INSERT INTO payment_methods (name, type, currency, initial_balance)
                SELECT 'Sin asignar (USD)', 'other', 'USD', 0
                WHERE EXISTS (
                    SELECT 1 FROM transactions
                    WHERE payment_method_id IS NULL AND currency = 'USD'
                );

                UPDATE transactions
                SET payment_method_id =
                    (SELECT id FROM payment_methods WHERE name = 'Sin asignar (ARS)')
                WHERE payment_method_id IS NULL AND currency = 'ARS';

                UPDATE transactions
                SET payment_method_id =
                    (SELECT id FROM payment_methods WHERE name = 'Sin asignar (USD)')
                WHERE payment_method_id IS NULL AND currency = 'USD';
            ",
            kind: MigrationKind::Up,
        },
        // Every list and filter in the app sorts or narrows by these columns, and
        // the table had no index at all — fine at 50 rows, not at a few thousand.
        Migration {
            version: 14,
            description: "index_transaction_lookup_columns",
            sql: "
                CREATE INDEX IF NOT EXISTS idx_transactions_date
                    ON transactions(date);
                CREATE INDEX IF NOT EXISTS idx_transactions_category
                    ON transactions(category_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_payment_method
                    ON transactions(payment_method_id);
                CREATE INDEX IF NOT EXISTS idx_transactions_destination
                    ON transactions(destination_payment_method_id);
            ",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:vault-ai.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            read_text_file,
            backup_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
