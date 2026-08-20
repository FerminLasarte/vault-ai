import { useContext } from "react";
import { AppDataContext, type AppData } from "@/context/AppDataContext";

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
