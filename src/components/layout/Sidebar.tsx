import {
  ChartPie,
  Landmark,
  Tags,
  ArrowLeftRight,
  Settings,
  CreditCard,
  PiggyBank,
  Repeat,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VaultLogo } from "@/components/VaultLogo";
import { isMacOS } from "@/lib/platform";

export type View =
  | "statistics"
  | "transactions"
  | "categories"
  | "accounts"
  | "recurring"
  | "budgets"
  | "debts"
  | "savings"
  | "settings";

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

// The places the user actually works in, in the order the work tends to happen.
const MAIN_ITEMS = [
  { view: "statistics", label: "Estadísticas", icon: ChartPie },
  { view: "transactions", label: "Transacciones", icon: ArrowLeftRight },
  { view: "recurring", label: "Recurrentes", icon: Repeat },
  { view: "categories", label: "Categorías", icon: Tags },
  { view: "accounts", label: "Cuentas", icon: Landmark },
  { view: "budgets", label: "Presupuestos", icon: Target },
  { view: "debts", label: "Deudas", icon: CreditCard },
  { view: "savings", label: "Ahorros", icon: PiggyBank },
] as const satisfies ReadonlyArray<NavItem>;

// Configuration rather than a destination, so it sits apart at the bottom
// instead of competing with the six views above it.
const FOOTER_ITEMS = [
  { view: "settings", label: "Ajustes", icon: Settings },
] as const satisfies ReadonlyArray<NavItem>;

interface NavButtonProps {
  item: NavItem;
  isCurrent: boolean;
  onNavigate: (view: View) => void;
}

function NavButton({ item, isCurrent, onNavigate }: NavButtonProps) {
  const { view, label, icon: Icon } = item;

  return (
    <button
      type="button"
      title={label}
      aria-current={isCurrent ? "page" : undefined}
      onClick={() => onNavigate(view)}
      className={cn(
        "flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors sm:justify-start sm:px-3",
        isCurrent
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground sm:w-60">
      {/* On macOS the title bar is an overlay, so the traffic lights float over
          this corner and the header has to start below them. Every other
          platform draws its own title bar above the content and needs no room. */}
      <div
        className={cn(
          "flex items-center justify-center gap-2 px-2 pb-6 sm:justify-start sm:px-6",
          isMacOS() ? "pt-10" : "pt-6",
        )}
      >
        {/* The cut-outs take the sidebar's own surface colour, so the mark
            reads correctly against it in either theme. */}
        <VaultLogo className="size-5 shrink-0 [--logo-cutout:var(--sidebar)]" />
        <span className="hidden font-heading text-lg font-semibold tracking-tight sm:inline">
          Vault
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 sm:px-3">
        {MAIN_ITEMS.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            isCurrent={currentView === item.view}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-1 px-2 pb-4 sm:px-3">
        {FOOTER_ITEMS.map((item) => (
          <NavButton
            key={item.view}
            item={item}
            isCurrent={currentView === item.view}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </aside>
  );
}
