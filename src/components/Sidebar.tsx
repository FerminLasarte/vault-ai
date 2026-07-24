import { ArrowLeftRight, LayoutDashboard, Settings, Tags, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Resumen", icon: LayoutDashboard, active: true },
  { label: "Transacciones", icon: ArrowLeftRight, active: false },
  { label: "Categorías", icon: Tags, active: false },
  { label: "Ajustes", icon: Settings, active: false },
] as const;

export function Sidebar() {
  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-6 py-6">
        <Wallet className="size-5" />
        <span className="font-heading text-lg font-semibold tracking-tight">
          Vault
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <button
            key={label}
            type="button"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
