import type { PaymentMethodType, TransactionType } from "@/db/schema";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: "Ingreso",
  expense: "Gasto",
};

export const PAYMENT_METHOD_TYPE_LABELS: Record<PaymentMethodType, string> = {
  bank: "Banco",
  cash: "Efectivo",
  wallet: "Billetera virtual",
  card: "Tarjeta",
};

export const PAYMENT_METHOD_TYPES = Object.keys(
  PAYMENT_METHOD_TYPE_LABELS,
) as PaymentMethodType[];
