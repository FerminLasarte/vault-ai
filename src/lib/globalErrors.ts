import { toast } from "sonner";

// Error boundaries only catch what throws during render. An await that rejects
// inside a click handler never passes through React at all, so without these
// two listeners it fails in complete silence — no toast, no visible sign that
// the action the user just took did nothing.
export function installGlobalErrorHandlers(): void {
  window.addEventListener("error", (event) => {
    console.error("Uncaught error:", event.error ?? event.message);
    // A single id, so a burst of failures replaces one toast instead of
    // stacking a wall of them.
    toast.error("Ocurrió un error inesperado", { id: "global-error" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    toast.error("Una operación no pudo completarse", { id: "global-rejection" });
  });
}
