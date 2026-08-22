import { invoke } from "@tauri-apps/api/core";
import { documentDir, join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";

// The native pickers return the path the user chose; the actual reading and
// writing happens in Rust (see src-tauri/src/lib.rs), which keeps the webview
// from needing filesystem permissions of its own.

const CSV_FILTER = [{ name: "CSV", extensions: ["csv"] }];
const DB_FILTER = [{ name: "Base de datos SQLite", extensions: ["db"] }];

// Suggests the user's Documents folder rather than letting the panel reopen
// wherever it happened to be last. Documents is the sane default for a file the
// user is meant to keep: it is backed up by Time Machine and picked up by
// iCloud Drive when Desktop & Documents sync is on, which puts a copy off the
// machine — the one thing a local-first app cannot do for itself. Falls back to
// a bare file name if the folder cannot be resolved, which only loses the
// suggestion, not the save.
async function suggestPath(fileName: string): Promise<string> {
  try {
    return await join(await documentDir(), fileName);
  } catch {
    return fileName;
  }
}

// Returns false when the user dismissed the dialog, which is not an error.
export async function saveCsvFile(
  defaultName: string,
  contents: string,
): Promise<boolean> {
  const path = await save({
    defaultPath: await suggestPath(defaultName),
    filters: CSV_FILTER,
  });
  if (path === null) return false;

  await invoke("write_text_file", { path, contents });
  return true;
}

// Returns the file's contents, or null when the user dismissed the dialog.
export async function openCsvFile(): Promise<string | null> {
  const path = await open({ multiple: false, directory: false, filters: CSV_FILTER });
  if (path === null || typeof path !== "string") return null;

  return invoke<string>("read_text_file", { path });
}

export async function saveDatabaseCopy(defaultName: string): Promise<boolean> {
  const destination = await save({
    defaultPath: await suggestPath(defaultName),
    filters: DB_FILTER,
  });
  if (destination === null) return false;

  await invoke("backup_database", { destination });
  return true;
}
