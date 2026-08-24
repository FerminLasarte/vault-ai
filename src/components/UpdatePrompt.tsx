import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUpdater } from "@/hooks/useUpdater";

// The download toast is replaced in place rather than stacked, so a failure
// does not leave a spinner sitting under the error that explains it.
const DOWNLOAD_TOAST = "update-download";

// Looks for a new version once per launch and offers it without interrupting:
// a toast that can be ignored, not a dialog in front of the app. A check that
// fails says nothing — being offline is not something to report to someone who
// did not ask.
export function UpdatePrompt() {
  const { status, update, error, check, install } = useUpdater();

  // StrictMode runs effects twice in development, and the guard is what keeps
  // that from being two checks and two toasts for the same version.
  const checked = useRef(false);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    void check();
  }, [check]);

  const installing = useRef(false);
  const offered = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "available" || update === null) return;
    if (offered.current === update.version) return;
    offered.current = update.version;

    toast(`Vault ${update.version} ya está disponible`, {
      description: "Se descarga, se instala y la app se reinicia sola.",
      // No timeout: the offer should still be there when the user looks up.
      duration: Infinity,
      action: {
        label: "Instalar",
        onClick: () => {
          installing.current = true;
          toast.loading("Descargando la actualización...", { id: DOWNLOAD_TOAST });
          void install();
        },
      },
    });
  }, [status, update, install]);

  useEffect(() => {
    // Only a failed install is worth surfacing here. A failed check happens
    // silently in the background; the card in Ajustes is where someone who
    // asked for a check gets told it did not work.
    if (error === null || !installing.current) return;
    installing.current = false;
    toast.error(error, { id: DOWNLOAD_TOAST });
  }, [error]);

  return null;
}
