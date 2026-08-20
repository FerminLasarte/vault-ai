import { useState } from "react";
import { Sidebar, type View } from "@/components/layout/Sidebar";
import { StatisticsView } from "@/components/views/StatisticsView";
import { TransactionsView } from "@/components/views/TransactionsView";
import { CategoriesView } from "@/components/views/CategoriesView";
import { AccountsView } from "@/components/views/AccountsView";
import { Toaster } from "@/components/ui/sonner";
import { AppDataProvider } from "@/context/AppDataContext";

const VIEWS: Record<View, () => React.JSX.Element> = {
  statistics: StatisticsView,
  transactions: TransactionsView,
  categories: CategoriesView,
  accounts: AccountsView,
};

function App() {
  const [view, setView] = useState<View>("statistics");
  const CurrentView = VIEWS[view];

  return (
    <AppDataProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar currentView={view} onNavigate={setView} />
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
          <CurrentView />
        </main>
      </div>
      <Toaster position="bottom-right" />
    </AppDataProvider>
  );
}

export default App;
