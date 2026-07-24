import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { initDatabase } from "@/db";

function App() {
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error("Failed to initialize local database:", error);
    });
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
