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
  deleteAttachment,
  advanceInstallmentPlan,
  advanceLoan,
  deleteBudget,
  deleteCategory,
  deleteInstallmentPlan,
  deleteLoan,
  deleteSavingsContribution,
  deleteSavingsGoal,
  deleteRecurringTransaction,
  deleteCategoryRule,
  deletePaymentMethod,
  deleteTransaction,
  EXCHANGE_RATE_TYPE,
  getLatestExchangeRate,
  getSetting,
  LAST_BACKUP_AT,
  initDatabase,
  insertAttachment,
  insertBudget,
  insertCategory,
  insertInstallmentPlan,
  insertLoan,
  insertSavingsContribution,
  insertSavingsGoal,
  insertRecurringTransaction,
  insertCategoryRule,
  insertPaymentMethod,
  insertTransaction,
  insertTransactions,
  listBudgets,
  listCategories,
  listInstallmentPlans,
  listLoans,
  listSavingsContributions,
  listSavingsGoals,
  listExchangeRates,
  listRecurringTransactions,
  listCategoryRules,
  listPaymentMethods,
  listTags,
  listTransactionsWithCategory,
  updateCategory,
  setSetting,
  setTransactionTags,
  markRecurringConfirmed,
  updateBudget,
  updateInstallmentPlan,
  updateLoan,
  updateSavingsGoal,
  updateCategoryRule,
  updateRecurringTransaction,
  updatePaymentMethod,
  updateTransaction,
  upsertExchangeRate,
  upsertExchangeRates,
  type BudgetWithCategory,
  type Category,
  type CategoryRuleWithCategory,
  type ExchangeRate,
  type NewAttachment,
  type InstallmentPlanWithNames,
  type LoanWithNames,
  type NewBudget,
  type NewInstallmentPlan,
  type NewLoan,
  type NewSavingsGoal,
  type SavingsContribution,
  type SavingsGoalWithNames,
  type NewCategoryRule,
  type NewRecurringTransaction,
  type NewCategory,
  type NewPaymentMethod,
  type NewTransaction,
  type PaymentMethod,
  type RecurringTransactionWithNames,
  type Tag,
  type TransactionWithCategory,
} from "@/db";
import {
  DEFAULT_RATE_TYPE,
  fetchRate,
  fetchRateHistory,
  isRateType,
  MANUAL_RATE_SOURCE,
} from "@/lib/exchangeRate";
import type { RateType } from "@/lib/exchangeRate";
import { todayIsoDate } from "@/lib/format";

export interface AppData {
  transactions: TransactionWithCategory[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  categoryRules: CategoryRuleWithCategory[];
  tags: Tag[];
  budgets: BudgetWithCategory[];
  recurring: RecurringTransactionWithNames[];
  installmentPlans: InstallmentPlanWithNames[];
  loans: LoanWithNames[];
  savingsGoals: SavingsGoalWithNames[];
  savingsContributions: SavingsContribution[];
  // Latest known MEP quote, or null before the very first successful fetch.
  // Which dollar the app values foreign movements at. Persisted, because a
  // conversion that silently changes meaning between launches is worse than no
  // conversion at all.
  rateType: RateType;
  exchangeRate: ExchangeRate | null;
  // Every cached quote, used to value each movement at the rate of its own
  // date instead of restating the past at today's.
  exchangeRateHistory: ExchangeRate[];
  // When the last backup was taken, or null if there has never been one.
  lastBackupAt: string | null;
  isLoading: boolean;
  isMutating: boolean;
  isRefreshingRate: boolean;

  addTransaction: (transaction: NewTransaction, tags: string[]) => Promise<void>;
  editTransaction: (
    id: number,
    transaction: NewTransaction,
    tags: string[],
  ) => Promise<void>;
  removeTransaction: (id: number) => Promise<void>;
  importTransactions: (
    entries: { transaction: NewTransaction; tags: string[] }[],
  ) => Promise<void>;

  addSavingsGoal: (goal: NewSavingsGoal) => Promise<void>;
  editSavingsGoal: (id: number, goal: NewSavingsGoal) => Promise<void>;
  removeSavingsGoal: (id: number) => Promise<void>;
  addSavingsContribution: (
    goalId: number,
    amount: number,
    date: string,
    note: string | null,
  ) => Promise<void>;
  removeSavingsContribution: (id: number) => Promise<void>;

  addLoan: (loan: NewLoan) => Promise<void>;
  editLoan: (id: number, loan: NewLoan) => Promise<void>;
  removeLoan: (id: number) => Promise<void>;
  // Records the payment as a real movement and advances the loan by one, in
  // that order, so a failure never leaves a loan claiming a payment that was
  // never written.
  confirmLoanPayment: (
    id: number,
    index: number,
    date: string,
    amount: number,
  ) => Promise<void>;

  addInstallmentPlan: (plan: NewInstallmentPlan) => Promise<void>;
  editInstallmentPlan: (id: number, plan: NewInstallmentPlan) => Promise<void>;
  removeInstallmentPlan: (id: number) => Promise<void>;
  // Records one instalment as paid: writes the movement and advances the plan.
  confirmInstallment: (
    id: number,
    index: number,
    date: string,
    amount: number,
  ) => Promise<void>;

  addRecurring: (recurring: NewRecurringTransaction) => Promise<void>;
  editRecurring: (id: number, recurring: NewRecurringTransaction) => Promise<void>;
  removeRecurring: (id: number) => Promise<void>;
  // Turns one proposed occurrence into a real transaction and moves the series
  // past it, so it is never proposed twice.
  confirmRecurring: (id: number, date: string) => Promise<void>;
  // Decides against an occurrence without recording anything, moving the series
  // past it just the same.
  dismissRecurring: (id: number, date: string) => Promise<void>;

  // Attachments are not held in context: only their count travels with the
  // transaction list, and the bytes are fetched by the dialog that shows them.
  addAttachment: (attachment: NewAttachment) => Promise<void>;
  removeAttachment: (id: number) => Promise<void>;

  addBudget: (budget: NewBudget) => Promise<void>;
  editBudget: (id: number, budget: NewBudget) => Promise<void>;
  removeBudget: (id: number) => Promise<void>;

  addCategoryRule: (rule: NewCategoryRule) => Promise<void>;
  editCategoryRule: (id: number, rule: NewCategoryRule) => Promise<void>;
  removeCategoryRule: (id: number) => Promise<void>;

  addCategory: (category: NewCategory) => Promise<void>;
  editCategory: (id: number, category: NewCategory) => Promise<void>;
  removeCategory: (id: number) => Promise<void>;

  addPaymentMethod: (method: NewPaymentMethod) => Promise<void>;
  editPaymentMethod: (id: number, method: NewPaymentMethod) => Promise<void>;
  removePaymentMethod: (id: number) => Promise<void>;

  setRateType: (type: RateType) => Promise<void>;
  refreshExchangeRate: (options?: { silent?: boolean }) => Promise<void>;
  saveManualExchangeRate: (buy: number, sell: number) => Promise<void>;
  // Downloads the whole historical series. Explicit rather than automatic:
  // it is a few thousand records and only needs doing once.
  backfillExchangeRates: () => Promise<number>;
  // Called after a backup actually lands on disk, so the reminder measures
  // real copies rather than attempts.
  recordBackup: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRuleWithCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransactionWithNames[]>([]);
  const [installmentPlans, setInstallmentPlans] = useState<InstallmentPlanWithNames[]>(
    [],
  );
  const [loans, setLoans] = useState<LoanWithNames[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalWithNames[]>([]);
  const [savingsContributions, setSavingsContributions] = useState<SavingsContribution[]>(
    [],
  );
  const [rateType, setRateTypeState] = useState<RateType>(DEFAULT_RATE_TYPE);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [exchangeRateHistory, setExchangeRateHistory] = useState<ExchangeRate[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRefreshingRate, setIsRefreshingRate] = useState(false);

  const refresh = useCallback(async () => {
    await initDatabase();

    // Which series to load has to be known before the queries go out, so this
    // one setting is read on its own rather than inside the batch below.
    const storedRateType = await getSetting(EXCHANGE_RATE_TYPE);
    const activeRateType = isRateType(storedRateType)
      ? storedRateType
      : DEFAULT_RATE_TYPE;

    const [
      nextTransactions,
      nextCategories,
      nextPaymentMethods,
      nextCategoryRules,
      nextTags,
      nextBudgets,
      nextRecurring,
      nextPlans,
      nextLoans,
      nextGoals,
      nextContributions,
      cachedRate,
      cachedHistory,
      storedLastBackup,
    ] = await Promise.all([
      listTransactionsWithCategory(),
      listCategories(),
      listPaymentMethods(),
      listCategoryRules(),
      listTags(),
      listBudgets(),
      listRecurringTransactions(),
      listInstallmentPlans(),
      listLoans(),
      listSavingsGoals(),
      listSavingsContributions(),
      getLatestExchangeRate(activeRateType),
      listExchangeRates(activeRateType),
      getSetting(LAST_BACKUP_AT),
    ]);
    setTransactions(nextTransactions);
    setCategories(nextCategories);
    setPaymentMethods(nextPaymentMethods);
    setCategoryRules(nextCategoryRules);
    setTags(nextTags);
    setBudgets(nextBudgets);
    setRecurring(nextRecurring);
    setInstallmentPlans(nextPlans);
    setLoans(nextLoans);
    setSavingsGoals(nextGoals);
    setSavingsContributions(nextContributions);
    setRateTypeState(activeRateType);
    setExchangeRate(cachedRate);
    setExchangeRateHistory(cachedHistory);
    setLastBackupAt(storedLastBackup);
  }, []);

  // Fetches the current quote and caches it. A failure is not exceptional —
  // the app is local-first and expected to run offline — so the cached rate is
  // kept and only an explicit, user-triggered refresh reports the problem.
  const refreshExchangeRate = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      setIsRefreshingRate(true);
      try {
        const rate = await fetchRate(rateType);
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
    [rateType],
  );

  // Switching rates keeps whatever was already downloaded for the new one and
  // shows it immediately, then goes to the network. Nothing is deleted: the old
  // series stays cached, so changing back is instant rather than another
  // multi-thousand-record download.
  const setRateType = useCallback(async (type: RateType) => {
    await setSetting(EXCHANGE_RATE_TYPE, type);
    setRateTypeState(type);

    const [cachedRate, cachedHistory] = await Promise.all([
      getLatestExchangeRate(type),
      listExchangeRates(type),
    ]);
    setExchangeRate(cachedRate);
    setExchangeRateHistory(cachedHistory);

    try {
      const rate = await fetchRate(type);
      await upsertExchangeRate(rate);
      setExchangeRate(rate);
    } catch (error) {
      // Offline is normal for a local-first app; the cached quote above stands.
      console.error("Failed to fetch the newly selected rate:", error);
    }
  }, []);

  const recordBackup = useCallback(async () => {
    const takenAt = new Date().toISOString();
    await setSetting(LAST_BACKUP_AT, takenAt);
    setLastBackupAt(takenAt);
  }, []);

  const backfillExchangeRates = useCallback(async () => {
    setIsRefreshingRate(true);
    try {
      const history = await fetchRateHistory(rateType);
      const written = await upsertExchangeRates(history);
      setExchangeRateHistory(await listExchangeRates(rateType));
      toast.success(`${written} cotizaciones guardadas`);
      return written;
    } catch (error) {
      console.error("Failed to back-fill the exchange rate history:", error);
      toast.error("No se pudo traer el histórico de cotizaciones");
      return 0;
    } finally {
      setIsRefreshingRate(false);
    }
  }, [rateType]);

  // A manual correction is stored under today's date, overwriting whatever was
  // fetched for today, and is marked as such so the UI can say so.
  const saveManualExchangeRate = useCallback(
    async (buy: number, sell: number) => {
      const rate: ExchangeRate = {
        date: todayIsoDate(),
        rate_type: rateType,
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
    },
    [rateType],
  );

  useEffect(() => {
    // Loading the database on mount is what an effect is for. The rule fires
    // because `refresh` eventually sets state, but it does so after an await:
    // this reads an external system, it does not derive state from props.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Same reason as above: a network fetch whose result arrives long after
    // this effect has returned.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshExchangeRate({ silent: true });
  }, [isLoading, refreshExchangeRate]);

  // Every mutation reloads the whole dataset, so a change made in one view is
  // immediately reflected in the statistics and in every other view.
  const runMutation = useCallback(
    async (
      mutation: () => Promise<void>,
      successMessage: string,
      errorMessage: string,
    ) => {
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
      categoryRules,
      tags,
      budgets,
      recurring,
      installmentPlans,
      loans,
      savingsGoals,
      savingsContributions,
      rateType,
      exchangeRate,
      exchangeRateHistory,
      lastBackupAt,
      isLoading,
      isMutating,
      isRefreshingRate,

      setRateType,
      refreshExchangeRate,
      saveManualExchangeRate,
      backfillExchangeRates,
      recordBackup,

      addTransaction: (transaction, transactionTags) =>
        runMutation(
          async () => {
            const id = await insertTransaction(transaction);
            await setTransactionTags(id, transactionTags);
          },
          "Transacción agregada",
          "No se pudo agregar la transacción",
        ),
      editTransaction: (id, transaction, transactionTags) =>
        runMutation(
          async () => {
            await updateTransaction(id, transaction);
            await setTransactionTags(id, transactionTags);
          },
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

      addSavingsGoal: (goal) =>
        runMutation(
          () => insertSavingsGoal(goal),
          "Objetivo creado",
          "No se pudo crear el objetivo",
        ),
      editSavingsGoal: (id, goal) =>
        runMutation(
          () => updateSavingsGoal(id, goal),
          "Objetivo actualizado",
          "No se pudo actualizar el objetivo",
        ),
      removeSavingsGoal: (id) =>
        runMutation(
          () => deleteSavingsGoal(id),
          "Objetivo eliminado",
          "No se pudo eliminar el objetivo",
        ),
      addSavingsContribution: (goalId, amount, date, note) =>
        runMutation(
          () => insertSavingsContribution(goalId, amount, date, note),
          "Aporte registrado",
          "No se pudo registrar el aporte",
        ),
      removeSavingsContribution: (id) =>
        runMutation(
          () => deleteSavingsContribution(id),
          "Aporte eliminado",
          "No se pudo eliminar el aporte",
        ),

      addLoan: (loan) =>
        runMutation(
          () => insertLoan(loan),
          "Préstamo creado",
          "No se pudo crear el préstamo",
        ),
      editLoan: (id, loan) =>
        runMutation(
          () => updateLoan(id, loan),
          "Préstamo actualizado",
          "No se pudo actualizar el préstamo",
        ),
      removeLoan: (id) =>
        runMutation(
          () => deleteLoan(id),
          "Préstamo eliminado",
          "No se pudo eliminar el préstamo",
        ),
      confirmLoanPayment: (id, index, date, amount) =>
        runMutation(
          async () => {
            const loan = loans.find((entry) => entry.id === id);
            if (!loan) return;

            // A payment on money I owe leaves my pocket; a payment on money
            // owed to me arrives in it. Recording both as expenses would make
            // being repaid look like a cost.
            await insertTransaction({
              amount,
              type: loan.direction === "borrowed" ? "expense" : "income",
              currency: loan.currency,
              categoryId: loan.category_id,
              paymentMethodId: loan.payment_method_id,
              destinationPaymentMethodId: null,
              destinationAmount: null,
              description: `${loan.description} (${index + 1}/${loan.installment_count})`,
              date,
            });
            await advanceLoan(id, index + 1);
          },
          "Cuota registrada",
          "No se pudo registrar la cuota",
        ),

      addInstallmentPlan: (plan) =>
        runMutation(
          () => insertInstallmentPlan(plan),
          "Compra en cuotas creada",
          "No se pudo crear la compra en cuotas",
        ),
      editInstallmentPlan: (id, plan) =>
        runMutation(
          () => updateInstallmentPlan(id, plan),
          "Compra en cuotas actualizada",
          "No se pudo actualizar la compra en cuotas",
        ),
      removeInstallmentPlan: (id) =>
        runMutation(
          () => deleteInstallmentPlan(id),
          "Compra en cuotas eliminada",
          "No se pudo eliminar la compra en cuotas",
        ),
      confirmInstallment: (id, index, date, amount) =>
        runMutation(
          async () => {
            const plan = installmentPlans.find((entry) => entry.id === id);
            if (!plan) return;

            await insertTransaction({
              amount,
              type: "expense",
              currency: plan.currency,
              categoryId: plan.category_id,
              paymentMethodId: plan.payment_method_id,
              destinationPaymentMethodId: null,
              destinationAmount: null,
              description: `${plan.description} (${index + 1}/${plan.installment_count})`,
              date,
            });
            await advanceInstallmentPlan(id, index + 1);
          },
          "Cuota registrada",
          "No se pudo registrar la cuota",
        ),

      addRecurring: (entry) =>
        runMutation(
          () => insertRecurringTransaction(entry),
          "Recurrente creada",
          "No se pudo crear la recurrente",
        ),
      editRecurring: (id, entry) =>
        runMutation(
          () => updateRecurringTransaction(id, entry),
          "Recurrente actualizada",
          "No se pudo actualizar la recurrente",
        ),
      removeRecurring: (id) =>
        runMutation(
          () => deleteRecurringTransaction(id),
          "Recurrente eliminada",
          "No se pudo eliminar la recurrente",
        ),
      confirmRecurring: (id, date) =>
        runMutation(
          async () => {
            const template = recurring.find((entry) => entry.id === id);
            if (!template) return;

            await insertTransaction({
              amount: template.amount,
              type: template.type,
              currency: template.currency,
              categoryId: template.category_id,
              paymentMethodId: template.payment_method_id,
              destinationPaymentMethodId: null,
              destinationAmount: null,
              description: template.description,
              date,
            });
            await markRecurringConfirmed(id, date);
          },
          "Movimiento registrado",
          "No se pudo registrar el movimiento",
        ),
      dismissRecurring: (id, date) =>
        runMutation(
          () => markRecurringConfirmed(id, date),
          "Ocurrencia descartada",
          "No se pudo descartar la ocurrencia",
        ),

      addAttachment: (attachment) =>
        runMutation(
          () => insertAttachment(attachment),
          "Comprobante adjuntado",
          "No se pudo adjuntar el comprobante",
        ),
      removeAttachment: (id) =>
        runMutation(
          () => deleteAttachment(id),
          "Comprobante eliminado",
          "No se pudo eliminar el comprobante",
        ),

      addBudget: (budget) =>
        runMutation(
          () => insertBudget(budget),
          "Presupuesto creado",
          "No se pudo crear el presupuesto",
        ),
      editBudget: (id, budget) =>
        runMutation(
          () => updateBudget(id, budget),
          "Presupuesto actualizado",
          "No se pudo actualizar el presupuesto",
        ),
      removeBudget: (id) =>
        runMutation(
          () => deleteBudget(id),
          "Presupuesto eliminado",
          "No se pudo eliminar el presupuesto",
        ),

      addCategoryRule: (rule) =>
        runMutation(
          () => insertCategoryRule(rule),
          "Regla creada",
          "No se pudo crear la regla",
        ),
      editCategoryRule: (id, rule) =>
        runMutation(
          () => updateCategoryRule(id, rule),
          "Regla actualizada",
          "No se pudo actualizar la regla",
        ),
      removeCategoryRule: (id) =>
        runMutation(
          () => deleteCategoryRule(id),
          "Regla eliminada",
          "No se pudo eliminar la regla",
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
      categoryRules,
      tags,
      budgets,
      recurring,
      installmentPlans,
      loans,
      savingsGoals,
      savingsContributions,
      rateType,
      exchangeRate,
      exchangeRateHistory,
      lastBackupAt,
      isLoading,
      isMutating,
      isRefreshingRate,
      setRateType,
      refreshExchangeRate,
      saveManualExchangeRate,
      backfillExchangeRates,
      recordBackup,
      runMutation,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
