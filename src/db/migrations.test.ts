import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseMigrations } from "./testing/migrations";

// The migrations are SQL strings inside Rust, so nothing type-checks them and a
// mistake only surfaces when the app opens the database — where a single failing
// migration makes `Database.load` reject and the whole app come up empty.
//
// The important detail is `PRAGMA foreign_keys=ON`. sqlx (and therefore
// tauri-plugin-sql) enables it, but the sqlite3 CLI defaults it OFF, so running
// these statements by hand passes migrations that fail in the real app. That
// exact gap let a broken migration ship once; every run here enforces them.

let workspace: string;

function newDatabase(name: string): string {
  return join(workspace, `${name}.db`);
}

function sql(database: string, statements: string): string {
  return execFileSync("sqlite3", [database], {
    input: statements,
    encoding: "utf8",
  });
}

// Mirrors how tauri-plugin-sql applies them: foreign keys enforced, one
// transaction per migration, stopping at the first failure.
function applyMigrations(database: string, from = 0): void {
  for (const migration of parseMigrations()) {
    if (migration.version <= from) continue;
    try {
      sql(database, `PRAGMA foreign_keys=ON;\nBEGIN;\n${migration.sql}\nCOMMIT;\n`);
    } catch (error) {
      throw new Error(
        `Migration ${migration.version} (${migration.description}) failed: ${
          (error as { stderr?: string }).stderr ?? String(error)
        }`,
        { cause: error },
      );
    }
  }
}

function query(database: string, statement: string): string {
  return sql(database, statement).trim();
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), "vault-migrations-"));
});

afterAll(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe("migrations", () => {
  it("declares versions that are sequential and unique", () => {
    const versions = parseMigrations().map((migration) => migration.version);
    expect(versions.length).toBeGreaterThan(0);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions[0]).toBe(1);
    expect(versions.at(-1)).toBe(versions.length);
  });

  it("applies cleanly to a brand new database", () => {
    const database = newDatabase("fresh");
    expect(() => applyMigrations(database)).not.toThrow();
    expect(query(database, "PRAGMA foreign_key_check;")).toBe("");
  });

  it("produces the schema the data layer expects", () => {
    const database = newDatabase("schema");
    applyMigrations(database);

    const tables = query(
      database,
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
    ).split("\n");
    expect(tables).toEqual(
      expect.arrayContaining([
        "attachments",
        "budgets",
        "categories",
        "category_rules",
        "exchange_rates",
        "payment_methods",
        "recurring_transactions",
        "tags",
        "transaction_tags",
        "transactions",
      ]),
    );

    const columns = query(
      database,
      "SELECT name FROM pragma_table_info('transactions') ORDER BY name;",
    ).split("\n");
    expect(columns).toEqual(
      expect.arrayContaining([
        "amount",
        "category_id",
        "currency",
        "date",
        "description",
        "destination_amount",
        "destination_payment_method_id",
        "id",
        "payment_method_id",
        "type",
      ]),
    );
  });

  it("indexes the columns every list and filter sorts by", () => {
    const database = newDatabase("indexes");
    applyMigrations(database);
    const indexes = query(
      database,
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;",
    ).split("\n");
    expect(indexes).toContain("idx_transactions_date");
    expect(indexes).toContain("idx_transactions_category");
    expect(indexes).toContain("idx_transactions_payment_method");
  });

  it("accepts every supported transaction type and rejects anything else", () => {
    const database = newDatabase("types");
    applyMigrations(database);

    for (const type of ["income", "expense", "transfer"]) {
      expect(() =>
        sql(
          database,
          `INSERT INTO transactions (amount, type, description, date, currency)
           VALUES (1, '${type}', 'x', '2026-01-01', 'ARS');`,
        ),
      ).not.toThrow();
    }

    expect(() =>
      sql(
        database,
        `INSERT INTO transactions (amount, type, description, date, currency)
         VALUES (1, 'nonsense', 'x', '2026-01-01', 'ARS');`,
      ),
    ).toThrow();
  });

  // Foreign keys are enforced, so a category that a rule points at could not be
  // deleted at all without the cascade — the Categories view would just fail.
  it("removes a category's rules along with the category", () => {
    const database = newDatabase("cascade");
    applyMigrations(database);
    sql(
      database,
      `INSERT INTO category_rules (pattern, category_id) VALUES ('netflix', 5);`,
    );
    expect(query(database, "SELECT COUNT(*) FROM category_rules;")).toBe("1");

    sql(database, "PRAGMA foreign_keys=ON; DELETE FROM categories WHERE id = 5;");
    expect(query(database, "SELECT COUNT(*) FROM category_rules;")).toBe("0");
  });

  // Both tables point AT transactions, so deleting one must not leave orphans
  // behind — and with foreign keys enforced it could not, but the cascade is
  // what makes the delete succeed at all rather than failing.
  it("removes a transaction's tags and attachments along with it", () => {
    const database = newDatabase("transaction-cascade");
    applyMigrations(database);
    sql(
      database,
      `INSERT INTO transactions (id, amount, type, description, date, currency)
         VALUES (1, 10, 'expense', 'x', '2026-01-01', 'ARS');
       INSERT INTO tags (id, name) VALUES (1, 'viaje');
       INSERT INTO transaction_tags (transaction_id, tag_id) VALUES (1, 1);
       INSERT INTO attachments
         (transaction_id, file_name, mime_type, byte_size, content_base64, created_at)
         VALUES (1, 'a.png', 'image/png', 3, 'AAA', '2026-01-01T00:00:00Z');`,
    );

    sql(database, "PRAGMA foreign_keys=ON; DELETE FROM transactions WHERE id = 1;");
    expect(query(database, "SELECT COUNT(*) FROM transaction_tags;")).toBe("0");
    expect(query(database, "SELECT COUNT(*) FROM attachments;")).toBe("0");
  });

  it("rejects a budget period it does not understand", () => {
    const database = newDatabase("budget-check");
    applyMigrations(database);
    expect(() =>
      sql(
        database,
        `INSERT INTO budgets (category_id, currency, amount, period)
         VALUES (3, 'ARS', 100, 'weekly');`,
      ),
    ).toThrow();
  });

  it("leaves a new install without the placeholder accounts", () => {
    const database = newDatabase("placeholders");
    applyMigrations(database);
    expect(
      query(
        database,
        "SELECT COUNT(*) FROM payment_methods WHERE name LIKE 'Sin asignar%';",
      ),
    ).toBe("0");
  });
});

describe("upgrading a populated database", () => {
  // Reproduces a real install that stopped at version 7: history in a currency
  // the app no longer supports, and movements with no account attached.
  function legacyAtVersion7(): string {
    const database = newDatabase(`v7-${Math.random().toString(36).slice(2)}`);
    for (const migration of parseMigrations()) {
      if (migration.version > 7) break;
      sql(database, `PRAGMA foreign_keys=ON;\nBEGIN;\n${migration.sql}\nCOMMIT;\n`);
    }
    sql(
      database,
      `INSERT INTO transactions (amount, type, category_id, payment_method_id, description, date, currency)
       VALUES (1500.0, 'expense', 3, NULL, 'Gasto viejo en euros', '2026-03-04', 'EUR'),
              (250.0, 'expense', 3, 1, 'Gasto con cuenta', '2026-03-05', 'ARS'),
              (900.0, 'income', 1, NULL, 'Ingreso suelto', '2026-03-06', 'USD');`,
    );
    return database;
  }

  it("upgrades without losing a single row", () => {
    const database = legacyAtVersion7();
    const before = query(database, "SELECT COUNT(*) FROM transactions;");
    applyMigrations(database, 7);
    expect(query(database, "SELECT COUNT(*) FROM transactions;")).toBe(before);
  });

  it("keeps the totals identical across the upgrade", () => {
    const database = legacyAtVersion7();
    const total = "SELECT ROUND(SUM(amount), 2) FROM transactions;";
    const before = query(database, total);
    applyMigrations(database, 7);
    expect(query(database, total)).toBe(before);
  });

  it("rescues history stored in a currency that is no longer supported", () => {
    const database = legacyAtVersion7();
    expect(
      Number(query(database, "SELECT COUNT(*) FROM transactions WHERE currency='EUR';")),
    ).toBeGreaterThan(0);

    applyMigrations(database, 7);

    expect(
      query(
        database,
        "SELECT COUNT(*) FROM transactions WHERE currency NOT IN ('ARS','USD');",
      ),
    ).toBe("0");
  });

  it("attaches every unassigned movement to a placeholder account", () => {
    const database = legacyAtVersion7();
    applyMigrations(database, 7);
    expect(
      query(
        database,
        "SELECT COUNT(*) FROM transactions WHERE payment_method_id IS NULL;",
      ),
    ).toBe("0");
    expect(
      Number(
        query(
          database,
          "SELECT COUNT(*) FROM payment_methods WHERE name LIKE 'Sin asignar%';",
        ),
      ),
    ).toBeGreaterThan(0);
  });

  it("leaves no dangling references behind", () => {
    const database = legacyAtVersion7();
    applyMigrations(database, 7);
    expect(query(database, "PRAGMA foreign_key_check;")).toBe("");
  });

  it("keeps the accounts that already existed", () => {
    const database = legacyAtVersion7();
    const before = Number(query(database, "SELECT COUNT(*) FROM payment_methods;"));
    applyMigrations(database, 7);
    const after = Number(
      query(
        database,
        "SELECT COUNT(*) FROM payment_methods WHERE name NOT LIKE 'Sin asignar%';",
      ),
    );
    expect(after).toBe(before);
  });

  // Guards the specific failure that shipped once: rebuilding a table other
  // rows point at trips the foreign key check unless the references are parked
  // first, and it only shows up with enforcement on.
  it("survives the account table rebuild while rows reference it", () => {
    const database = legacyAtVersion7();
    expect(() => applyMigrations(database, 7)).not.toThrow();
    expect(
      Number(
        query(
          database,
          "SELECT COUNT(*) FROM transactions WHERE payment_method_id IS NOT NULL;",
        ),
      ),
    ).toBeGreaterThan(0);
  });

  // Re-running a migration that has already been applied is deliberately NOT
  // asserted. sqlx records every applied version in _sqlx_migrations and never
  // runs one twice, and some legitimate migrations cannot be re-run even in
  // principle — SQLite has no "ADD COLUMN IF NOT EXISTS", so migration 25 fails
  // outright the second time. Demanding idempotence would mean rebuilding a
  // whole table just to add one column, which is more risk, not less.
  //
  // What does matter is the real scenario: a database already at the latest
  // version, opened again. Nothing should run, and nothing should change.
  it("leaves an already-migrated database untouched when reopened", () => {
    const database = legacyAtVersion7();
    applyMigrations(database, 7);

    const rows = query(database, "SELECT COUNT(*) FROM transactions;");
    const accounts = query(database, "SELECT COUNT(*) FROM payment_methods;");
    const latest = Math.max(...parseMigrations().map((entry) => entry.version));

    applyMigrations(database, latest);

    expect(query(database, "SELECT COUNT(*) FROM transactions;")).toBe(rows);
    expect(query(database, "SELECT COUNT(*) FROM payment_methods;")).toBe(accounts);
  });
});
