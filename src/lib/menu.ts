import type { View } from "@/components/layout/Sidebar";

// Event names, mirrored from src-tauri/src/menu.rs.
export const NAVIGATE_EVENT = "menu://navigate";
export const ACTION_EVENT = "menu://action";

// Menu entries that do something rather than just navigate. The ids match the
// ones the Rust side registers.
export const MENU_ACTIONS = [
  "new-transaction",
  "backup",
  "export-csv",
  "import-csv",
] as const;

export type MenuAction = (typeof MENU_ACTIONS)[number];

// Which view owns each action, so choosing "Exportar a CSV" from anywhere lands
// on the screen that performs it before the action is replayed there.
export const MENU_ACTION_VIEW: Record<MenuAction, View> = {
  "new-transaction": "transactions",
  backup: "settings",
  "export-csv": "settings",
  "import-csv": "settings",
};

export function isMenuAction(value: unknown): value is MenuAction {
  return typeof value === "string" && (MENU_ACTIONS as readonly string[]).includes(value);
}

// A menu click carries a sequence number rather than only the action, so
// choosing the same entry twice in a row is two distinct requests. Without it
// the second click would look identical to the first and be ignored.
export interface MenuRequest {
  action: MenuAction;
  seq: number;
}

// Props every view accepts. Most ignore them; a component that takes no
// arguments is still assignable here, so only the two views that respond to a
// menu entry have to declare anything.
export interface ViewProps {
  request: MenuRequest | null;
}
