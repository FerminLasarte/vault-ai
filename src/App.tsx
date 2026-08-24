import { useCallback, useMemo, useState } from "react";
import { Sidebar, type View } from "@/components/layout/Sidebar";
import { useAppData } from "@/hooks/useAppData";
import { pendingBadges } from "@/lib/pendingBadges";
import { todayIsoDate } from "@/lib/format";
import { StatisticsView } from "@/components/views/StatisticsView";
import { TransactionsView } from "@/components/views/TransactionsView";
import { CategoriesView } from "@/components/views/CategoriesView";
import { AccountsView } from "@/components/views/AccountsView";
import { RecurringView } from "@/components/views/RecurringView";
import { BudgetsView } from "@/components/views/BudgetsView";
import { DebtsView } from "@/components/views/DebtsView";
import { SavingsView } from "@/components/views/SavingsView";
import { SettingsView } from "@/components/views/SettingsView";
import { Toaster } from "@/components/ui/sonner";
import { AppDataProvider } from "@/context/AppDataContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { AppErrorFallback, ViewErrorFallback } from "@/components/ErrorFallback";
import { useMenuEvents } from "@/hooks/useMenuEvents";
import { MENU_ACTION_VIEW } from "@/lib/menu";
import type { MenuAction, MenuRequest, ViewProps } from "@/lib/menu";

// Views take the pending menu request, and a component that declares no props
// is still assignable here — so only the two that answer a menu entry have to
// know this exists.
const VIEWS: Record<View, (props: ViewProps) => React.JSX.Element> = {
  statistics: StatisticsView,
  transactions: TransactionsView,
  categories: CategoriesView,
  accounts: AccountsView,
  recurring: RecurringView,
  budgets: BudgetsView,
  debts: DebtsView,
  savings: SavingsView,
  settings: SettingsView,
};

// The sidebar is a child of the data provider while App itself renders it, so
// App cannot read the data. This wrapper sits on the inside and does, which
// keeps Sidebar a presentational component that simply takes counts.
function SidebarWithBadges({
  currentView,
  onNavigate,
}: {
  currentView: View;
  onNavigate: (view: View) => void;
}) {
  const { recurring, installmentPlans, loans, budgets, transactions } = useAppData();

  const badges = useMemo(
    () =>
      pendingBadges(
        { recurring, installmentPlans, loans, budgets, transactions },
        todayIsoDate(),
      ),
    [recurring, installmentPlans, loans, budgets, transactions],
  );

  return <Sidebar currentView={currentView} badges={badges} onNavigate={onNavigate} />;
}

function App() {
  const [view, setView] = useState<View>("statistics");
  const [request, setRequest] = useState<MenuRequest | null>(null);
  const CurrentView = VIEWS[view];

  // An action is answered by the view that owns it, which may not be the one on
  // screen, so navigating there is part of handling the click. The sequence
  // number is what makes picking the same entry twice count as two requests.
  const handleAction = useCallback((action: MenuAction) => {
    setView(MENU_ACTION_VIEW[action]);
    setRequest((previous) => ({ action, seq: (previous?.seq ?? 0) + 1 }));
  }, []);

  useMenuEvents({ onNavigate: setView, onAction: handleAction });

  return (
    // Two boundaries, deliberately. The outer one catches the providers, where
    // a failure leaves no interface to fall back to. The inner one wraps only
    // the current view, so one broken screen costs the screen rather than the
    // whole window — the sidebar stays usable and the user can navigate away.
    <ErrorBoundary
      fallback={(error) => <AppErrorFallback error={error} retry={() => {}} />}
    >
      <ThemeProvider>
        {/* A short delay keeps the tooltips from flashing as the pointer merely
            crosses a row of icon buttons on its way somewhere else. */}
        <TooltipProvider delay={350}>
          <AppDataProvider>
            <div className="flex h-screen bg-background text-foreground">
              <SidebarWithBadges currentView={view} onNavigate={setView} />
              <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
                <ErrorBoundary
                  resetKey={view}
                  fallback={(error, retry) => (
                    <ViewErrorFallback error={error} retry={retry} />
                  )}
                >
                  <CurrentView request={request} />
                </ErrorBoundary>
              </main>
            </div>
            <UpdatePrompt />
            <Toaster position="bottom-right" />
          </AppDataProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
