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
