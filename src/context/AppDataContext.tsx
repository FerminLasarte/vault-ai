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
  getLatestExchangeRate,
  initDatabase,
  insertCategory,
  insertPaymentMethod,
  insertTransaction,
  insertTransactions,
  listCategories,
  listPaymentMethods,
  listTransactionsWithCategory,
  updateCategory,
  updatePaymentMethod,
  updateTransaction,
  upsertExchangeRate,
  type Category,
  type ExchangeRate,
  type NewCategory,
  type NewPaymentMethod,
  type NewTransaction,
  type PaymentMethod,
  type TransactionWithCategory,
} from "@/db";
import {
  fetchMepRate,
  MANUAL_RATE_SOURCE,
} from "@/lib/exchangeRate";
import { todayIsoDate } from "@/lib/format";

export interface AppData {
  transactions: TransactionWithCategory[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  // Latest known MEP quote, or null before the very first successful fetch.
  exchangeRate: ExchangeRate | null;
  isLoading: boolean;
  isMutating: boolean;
  isRefreshingRate: boolean;

  addTransaction: (transaction: NewTransaction) => Promise<void>;
  editTransaction: (id: number, transaction: NewTransaction) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  importTransactions: (transactions: NewTransaction[]) => Promise<void>;

  addCategory: (category: NewCategory) => Promise<void>;
  editCategory: (id: number, category: NewCategory) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;

  addPaymentMethod: (method: NewPaymentMethod) => Promise<void>;
  editPaymentMethod: (id: number, method: NewPaymentMethod) => Promise<void>;
  removePaymentMethod: (id: number) => Promise<void>;

  refreshExchangeRate: (options?: { silent?: boolean }) => Promise<void>;
  saveManualExchangeRate: (buy: number, sell: number) => Promise<void>;

}

// eslint-disable-next-line react-refresh/only-export-components
export const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  const refresh = useCallback(async () => {
    await initDatabase();
    const [nextTransactions, nextCategories, nextPaymentMethods, cachedRate] =
      await Promise.all([
        listTransactionsWithCategory(),
        listCategories(),
        listPaymentMethods(),
        getLatestExchangeRate(),
      ]);
    setTransactions(nextTransactions);
    setCategories(nextCategories);
    setPaymentMethods(nextPaymentMethods);
    setExchangeRate(cachedRate);
  }, []);

  // Fetches the current quote and caches it. A failure is not exceptional —
  // the app is local-first and expected to run offline — so the cached rate is
  // kept and only an explicit, user-triggered refresh reports the problem.
  const refreshExchangeRate = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setIsRefreshingRate(true);
      try {
        const rate = await fetchMepRate();
        await upsertExchangeRate(rate);
        setExchangeRate(rate);
        if (!silent) toast.success("Cotización actualizada");
      } catch (error) {
        console.error("Failed to refresh the exchange rate:", error);
        if (!silent) {
          toast.error("No se pudo obtener la cotización", { id: "exchange-rate" });
        }
      } finally {
        setIsRefreshingRate(false);
      }
    },
    [],
  );

  // A manual correction is stored under today's date, overwriting whatever was
  // fetched for today, and is marked as such so the UI can say so.
  const saveManualExchangeRate = useCallback(async (buy: number, sell: number) => {
    const rate: ExchangeRate = {
      date: todayIsoDate(),
      buy,
      sell,
      source: MANUAL_RATE_SOURCE,
      fetched_at: new Date().toISOString(),
    };
    try {
      await upsertExchangeRate(rate);
      setExchangeRate(rate);
      toast.success("Cotización guardada");
    } catch (error) {
      console.error("Failed to save the manual exchange rate:", error);
      toast.error("No se pudo guardar la cotización");
      throw error;
    }
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

  // Deliberately waits for the initial load: `refresh` reads the cached rate
  // from the database, and starting the network fetch in parallel would let a
  // slow read overwrite the fresher figure the fetch just stored.
  useEffect(() => {
    if (isLoading) return;
    void refreshExchangeRate({ silent: true });
  }, [isLoading, refreshExchangeRate]);

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
      exchangeRate,
      isLoading,
      isMutating,
      isRefreshingRate,

      refreshExchangeRate,
      saveManualExchangeRate,

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
      importTransactions: (imported) =>
        runMutation(
          () => insertTransactions(imported),
          `${imported.length} transacciones importadas`,
          "No se pudieron importar las transacciones",
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

    }),
    [
      transactions,
      categories,
      paymentMethods,
      exchangeRate,
      isLoading,
      isMutating,
      isRefreshingRate,
      refreshExchangeRate,
      saveManualExchangeRate,
      runMutation,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
