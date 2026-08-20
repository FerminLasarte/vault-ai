use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:vault-ai.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
