import { useState } from "react";
import { Sidebar, type View } from "@/components/layout/Sidebar";
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
import { AppErrorFallback, ViewErrorFallback } from "@/components/ErrorFallback";

const VIEWS: Record<View, () => React.JSX.Element> = {
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

function App() {
  const [view, setView] = useState<View>("statistics");
  const CurrentView = VIEWS[view];

  return (
    // Two boundaries, deliberately. The outer one catches the providers, where
    // a failure leaves no interface to fall back to. The inner one wraps only
    // the current view, so one broken screen costs the screen rather than the
    // whole window — the sidebar stays usable and the user can navigate away.
    <ErrorBoundary fallback={(error) => <AppErrorFallback error={error} retry={() => {}} />}>
      <ThemeProvider>
        {/* A short delay keeps the tooltips from flashing as the pointer merely
            crosses a row of icon buttons on its way somewhere else. */}
        <TooltipProvider delay={350}>
          <AppDataProvider>
            <div className="flex h-screen bg-background text-foreground">
              <Sidebar currentView={view} onNavigate={setView} />
              <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
                <ErrorBoundary
                  resetKey={view}
                  fallback={(error, retry) => (
                    <ViewErrorFallback error={error} retry={retry} />
                  )}
                >
                  <CurrentView />
                </ErrorBoundary>
              </main>
            </div>
            <Toaster position="bottom-right" />
          </AppDataProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
