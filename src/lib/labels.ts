import type { CategoryType, PaymentMethodType, TransactionType } from "@/db/schema";

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
