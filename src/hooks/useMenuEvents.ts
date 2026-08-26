import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { ACTION_EVENT, isMenuAction, NAVIGATE_EVENT } from "@/lib/menu";
import { isMenuViewId, MENU_DESTINATIONS } from "@/lib/navigation";
import type { Destination } from "@/lib/navigation";
import type { MenuAction } from "@/lib/menu";

interface MenuEventHandlers {
  // Takes a destination rather than a view: the menu still lists the sections
  // that became tabs, so "Presupuestos" has to land on the right tab of the
  // categories screen rather than merely on the screen.
  onNavigate: (destination: Destination) => void;
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
        if (isMenuViewId(event.payload)) {
          onNavigate(MENU_DESTINATIONS[event.payload]);
        }
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
