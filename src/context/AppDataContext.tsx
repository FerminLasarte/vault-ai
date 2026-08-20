import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import {
  deleteCategory,
  deletePaymentMethod,
  deleteTransaction,
  initDatabase,
  insertCategory,
  insertPaymentMethod,
  insertRandomTransactions,
  insertTransaction,
  listCategories,
  listPaymentMethods,
  listTransactionsWithCategory,
  updateCategory,
  updatePaymentMethod,
  updateTransaction,
  type Category,
  type NewCategory,
  type NewPaymentMethod,
  type NewTransaction,
  type PaymentMethod,
  type TransactionWithCategory,
} from "@/db";

export interface AppData {
  transactions: TransactionWithCategory[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  isMutating: boolean;

  addTransaction: (transaction: NewTransaction) => Promise<void>;
  editTransaction: (id: number, transaction: NewTransaction) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;

  addCategory: (category: NewCategory) => Promise<void>;
  editCategory: (id: number, category: NewCategory) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;

  addPaymentMethod: (method: NewPaymentMethod) => Promise<void>;
  editPaymentMethod: (id: number, method: NewPaymentMethod) => Promise<void>;
  removePaymentMethod: (id: number) => Promise<void>;

  generateSampleData: (count?: number) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const refresh = useCallback(async () => {
    await initDatabase();
    const [nextTransactions, nextCategories, nextPaymentMethods] = await Promise.all([
      listTransactionsWithCategory(),
      listCategories(),
      listPaymentMethods(),
    ]);
    setTransactions(nextTransactions);
    setCategories(nextCategories);
    setPaymentMethods(nextPaymentMethods);
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        console.error("Failed to load application data:", error);
        // Stable id so a retry (or StrictMode's double effect in dev) replaces
        // the toast instead of stacking duplicates.
        toast.error("No se pudieron cargar los datos", { id: "app-data-load" });
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  // Every mutation reloads the whole dataset, so a change made in one view is
  // immediately reflected in the statistics and in every other view.
  const runMutation = useCallback(
    async (mutation: () => Promise<void>, successMessage: string, errorMessage: string) => {
      setIsMutating(true);
      try {
        await mutation();
        await refresh();
        toast.success(successMessage);
      } catch (error) {
        console.error(`${errorMessage}:`, error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const value = useMemo<AppData>(
    () => ({
      transactions,
      categories,
      paymentMethods,
      isLoading,
      isMutating,

      addTransaction: (transaction) =>
        runMutation(
          () => insertTransaction(transaction),
          "Transacción agregada",
          "No se pudo agregar la transacción",
        ),
      editTransaction: (id, transaction) =>
        runMutation(
          () => updateTransaction(id, transaction),
          "Transacción actualizada",
          "No se pudo actualizar la transacción",
        ),
      removeTransaction: (id) =>
        runMutation(
          () => deleteTransaction(id),
          "Transacción eliminada",
          "No se pudo eliminar la transacción",
        ),

      addCategory: (category) =>
        runMutation(
          () => insertCategory(category),
          "Categoría creada",
          "No se pudo crear la categoría",
        ),
      editCategory: (id, category) =>
        runMutation(
          () => updateCategory(id, category),
          "Categoría actualizada",
          "No se pudo actualizar la categoría",
        ),
      removeCategory: (id) =>
        runMutation(
          () => deleteCategory(id),
          "Categoría eliminada",
          "No se pudo eliminar la categoría",
        ),

      addPaymentMethod: (method) =>
        runMutation(
          () => insertPaymentMethod(method),
          "Cuenta creada",
          "No se pudo crear la cuenta",
        ),
      editPaymentMethod: (id, method) =>
        runMutation(
          () => updatePaymentMethod(id, method),
          "Cuenta actualizada",
          "No se pudo actualizar la cuenta",
        ),
      removePaymentMethod: (id) =>
        runMutation(
          () => deletePaymentMethod(id),
          "Cuenta eliminada",
          "No se pudo eliminar la cuenta",
        ),

      generateSampleData: (count = 5) =>
        runMutation(
          () => insertRandomTransactions(count),
          "Datos de prueba generados",
          "No se pudieron generar los datos de prueba",
        ),
    }),
    [transactions, categories, paymentMethods, isLoading, isMutating, runMutation],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
