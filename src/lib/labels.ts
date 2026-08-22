import type { RecurrenceFrequency } from "@/lib/recurring";
import type {
  BudgetPeriod,
  CategoryType,
  PaymentMethodType,
  TransactionType,
} from "@/db/schema";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
};

// Deliberately excludes "transfer": a category can only describe income or
// expense, so the category forms must not offer it.
export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: "Ingreso",
  expense: "Gasto",
};

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export const RECURRENCE_FREQUENCIES = Object.keys(
  RECURRENCE_FREQUENCY_LABELS,
) as RecurrenceFrequency[];

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: "Mensual",
  annual: "Anual",
};

export const BUDGET_PERIODS = Object.keys(BUDGET_PERIOD_LABELS) as BudgetPeriod[];

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank: "Banco",
  cash: "Efectivo",
  wallet: "Billetera virtual",
  card: "Tarjeta",
  other: "Otro",
};

export const PAYMENT_METHOD_TYPES = Object.keys(
  PAYMENT_METHOD_TYPE_LABELS,
) as PaymentMethodType[];
