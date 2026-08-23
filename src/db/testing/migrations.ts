import { readFileSync } from "node:fs";

// The migrations are SQL strings inside Rust, so nothing type-checks them and a
// mistake only surfaces when the app opens the database. Both the migration
// tests and the query tests need them, so the parser lives here rather than
// being duplicated in each.
const MIGRATIONS_SOURCE = "src-tauri/src/lib.rs";

export interface ParsedMigration {
  version: number;
  description: string;
  sql: string;
}

export function parseMigrations(): ParsedMigration[] {
  const source = readFileSync(MIGRATIONS_SOURCE, "utf8");
  const pattern =
    /version:\s*(\d+),\s*description:\s*"([^"]+)",\s*sql:\s*"([\s\S]*?)",\s*kind:/g;

  const parsed: ParsedMigration[] = [];
  for (const match of source.matchAll(pattern)) {
    parsed.push({
      version: Number(match[1]),
      description: match[2],
      sql: match[3],
    });
  }

  // A regex that silently matches nothing would turn every test below into a
  // vacuous pass against an empty schema.
  if (parsed.length === 0) {
    throw new Error(`No migrations were parsed out of ${MIGRATIONS_SOURCE}`);
  }

  return parsed.sort((a, b) => a.version - b.version);
}
