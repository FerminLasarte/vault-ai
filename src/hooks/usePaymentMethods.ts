import { useCallback, useEffect, useState } from "react";
import {
  deletePaymentMethod,
  initDatabase,
  insertPaymentMethod,
  listPaymentMethods,
  updatePaymentMethod,
  type NewPaymentMethod,
  type PaymentMethod,
} from "@/db";

interface UsePaymentMethodsResult {
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  isMutating: boolean;
  addPaymentMethod: (method: NewPaymentMethod) => Promise<void>;
  editPaymentMethod: (id: number, method: NewPaymentMethod) => Promise<void>;
  removePaymentMethod: (id: number) => Promise<void>;
}

export function usePaymentMethods(): UsePaymentMethodsResult {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  const refresh = useCallback(async () => {
    await initDatabase();
    setPaymentMethods(await listPaymentMethods());
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        console.error("Failed to load payment methods:", error);
      })
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const runMutation = useCallback(
    async (mutation: () => Promise<void>) => {
      setIsMutating(true);
      try {
        await mutation();
        await refresh();
      } finally {
        setIsMutating(false);
      }
    },
    [refresh],
  );

  const addPaymentMethod = useCallback(
    (method: NewPaymentMethod) => runMutation(() => insertPaymentMethod(method)),
    [runMutation],
  );

  const editPaymentMethod = useCallback(
    (id: number, method: NewPaymentMethod) =>
      runMutation(() => updatePaymentMethod(id, method)),
    [runMutation],
  );

  const removePaymentMethod = useCallback(
    (id: number) => runMutation(() => deletePaymentMethod(id)),
    [runMutation],
  );

  return {
    paymentMethods,
    isLoading,
    isMutating,
    addPaymentMethod,
    editPaymentMethod,
    removePaymentMethod,
  };
}
