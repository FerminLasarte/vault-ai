import { useCallback, useEffect, useState } from "react";
import {
  initDatabase,
  insertRandomTransactions,
  insertTransaction,
  listCategories,
  listTransactionsWithCategory,
  type Category,
  type NewTransaction,
  type TransactionWithCategory,
} from "@/db";

interface UseTransactionsResult {
  transactions: TransactionWithCategory[];
  categories: Category[];
  isLoading: boolean;
  isMutating: boolean;
  addTransaction: (transaction: NewTransaction) => Promise<void>;
  generateSampleData: (count?: number) => Promise<void>;
}

// Owns fetching and mutating raw transaction/category data. Period-aware
// derivations (summaries, chart data) live in useDashboardMetrics instead,
// keeping this hook a plain data source.
export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const refresh = useCallback(async () => {
    await initDatabase();
    const [nextTransactions, nextCategories] = await Promise.all([
      listTransactionsWithCategory(),
      listCategories(),
    ]);
    setTransactions(nextTransactions);
    setCategories(nextCategories);
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        console.error("Failed to load transactions:", error);
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const addTransaction = useCallback(
    async (transaction: NewTransaction) => {
      setIsMutating(true);
      try {
        await insertTransaction(transaction);
        await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const generateSampleData = useCallback(
    async (count = 5) => {
      setIsMutating(true);
      try {
        await insertRandomTransactions(count);
        await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  return {
    transactions,
    categories,
    isLoading,
    isMutating,
    addTransaction,
    generateSampleData,
  };
}
