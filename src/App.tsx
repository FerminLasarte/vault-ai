import { useEffect, useState } from "react";
import { Sidebar, type View } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Settings } from "@/components/Settings";
import { initDatabase } from "@/db";

function App() {
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    initDatabase().catch((error) => {
      console.error("Failed to initialize local database:", error);
    });
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar currentView={view} onNavigate={setView} />
      <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
        {view === "dashboard" ? <Dashboard /> : <Settings />}
      </main>
    </div>
  );
}

export default App;
