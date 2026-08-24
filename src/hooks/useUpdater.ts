import { useCallback, useEffect, useRef, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import type { Update } from "@tauri-apps/plugin-updater";

export type UpdaterStatus =
  "idle" | "checking" | "current" | "available" | "downloading" | "error";

export interface AvailableUpdate {
  version: string;
  notes?: string;
}

export interface Updater {
  status: UpdaterStatus;
  update: AvailableUpdate | null;
  // Fraction of the download completed, or null while the server has not said
  // how large the package is. Some responses omit the length entirely, and a
  // progress bar that invents one is worse than no bar at all.
  progress: number | null;
  error: string | null;
  check: () => Promise<void>;
  install: () => Promise<void>;
}

// Looking for a new version and installing it. The endpoint and the signing key
// live in tauri.conf.json: a package that is not signed by the matching private
// key is rejected before it is ever run, so a tampered download cannot pass
// itself off as an update.
export function useUpdater(): Updater {
  const [status, setStatus] = useState<UpdaterStatus>("idle");
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The Update handle owns a resource on the Rust side and is what performs the
  // download, but none of it belongs in render state — only the version and the
  // notes are ever displayed.
  const pending = useRef<Update | null>(null);

  useEffect(() => {
    return () => {
      void pending.current?.close();
    };
  }, []);

  const runCheck = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const found = await check();

      if (!found) {
        setUpdate(null);
        setStatus("current");
        return;
      }

      await pending.current?.close();
      pending.current = found;
      setUpdate({ version: found.version, notes: found.body });
      setStatus("available");
    } catch (cause) {
      console.error("Failed to check for updates:", cause);
      setError("No se pudo comprobar si hay una versión nueva");
      setStatus("error");
    }
  }, []);

  const install = useCallback(async () => {
    const found = pending.current;
    if (!found) return;

    setStatus("downloading");
    setProgress(null);
    setError(null);

    let total = 0;
    let received = 0;

    try {
      await found.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          if (total > 0) setProgress(0);
          return;
        }

        if (event.event === "Progress") {
          received += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(received / total, 1));
        }
      });

      // Reached only on macOS and Linux. The Windows installer replaces the
      // running executable, which means the process is gone before this line.
      await relaunch();
    } catch (cause) {
      console.error("Failed to install the update:", cause);
      setError("No se pudo instalar la actualización");
      setStatus("error");
    }
  }, []);

  return { status, update, progress, error, check: runCheck, install };
}
