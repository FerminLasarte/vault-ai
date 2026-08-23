import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { ACTION_EVENT, isMenuAction, NAVIGATE_EVENT } from "@/lib/menu";
import type { View } from "@/components/layout/Sidebar";
import type { MenuAction } from "@/lib/menu";

const VIEWS: readonly View[] = [
  "statistics",
  "transactions",
  "recurring",
  "categories",
  "accounts",
  "budgets",
  "debts",
  "savings",
  "settings",
];

function isView(value: unknown): value is View {
  return typeof value === "string" && (VIEWS as readonly string[]).includes(value);
}

interface MenuEventHandlers {
  onNavigate: (view: View) => void;
  onAction: (action: MenuAction) => void;
}

// Subscribes to the native menu. The payloads cross an IPC boundary as JSON, so
// they are validated rather than trusted: an id that no longer matches anything
// on this side should do nothing, not navigate to a view that does not exist.
export function useMenuEvents({ onNavigate, onAction }: MenuEventHandlers): void {
  useEffect(() => {
    // Both subscriptions resolve asynchronously, so unsubscribing has to wait
    // for them — otherwise a fast unmount leaks a listener that outlives the
    // component and fires against a stale closure.
    const subscriptions = Promise.all([
      listen<string>(NAVIGATE_EVENT, (event) => {
        if (isView(event.payload)) onNavigate(event.payload);
      }),
      listen<string>(ACTION_EVENT, (event) => {
        if (isMenuAction(event.payload)) onAction(event.payload);
      }),
    ]);

    return () => {
      void subscriptions.then((unlisten) => {
        for (const stop of unlisten) stop();
      });
    };
  }, [onNavigate, onAction]);
}
