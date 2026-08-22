import {
  ChartPie,
  Landmark,
  Tags,
  Wallet,
  ArrowLeftRight,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type View =
  | "statistics"
  | "transactions"
  | "categories"
  | "accounts"
  | "settings";

const NAV_ITEMS = [
  { view: "statistics", label: "Estadísticas", icon: ChartPie },
  { view: "transactions", label: "Transacciones", icon: ArrowLeftRight },
  { view: "categories", label: "Categorías", icon: Tags },
  { view: "accounts", label: "Cuentas", icon: Landmark },
  { view: "settings", label: "Ajustes", icon: Settings },
] as const satisfies ReadonlyArray<{ view: View; label: string; icon: LucideIcon }>;

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sm:w-60">
      <div className="flex items-center justify-center gap-2 px-2 py-6 sm:justify-start sm:px-6">
        <Wallet className="size-5 shrink-0" />
        <span className="hidden font-heading text-lg font-semibold tracking-tight sm:inline">
          Vault
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 sm:px-3">
        {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
          <button
            key={view}
            type="button"
            title={label}
            aria-current={currentView === view ? "page" : undefined}
            onClick={() => onNavigate(view)}
            className={cn(
              "flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors sm:justify-start sm:px-3",
              currentView === view
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
