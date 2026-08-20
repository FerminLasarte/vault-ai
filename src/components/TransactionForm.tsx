import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import type {
  Category,
  NewTransaction,
  PaymentMethod,
  TransactionWithCategory,
} from "@/db";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import { CURRENCY_LABELS } from "@/lib/currency";
import { todayIsoDate } from "@/lib/format";

const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("El monto debe ser mayor que 0"),
  currency: z.string().min(1, "Selecciona una moneda"),
  paymentMethodId: z.coerce.number().int().positive("Selecciona un método de pago"),
  categoryId: z.coerce.number().int().positive("Selecciona una categoría"),
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  date: z
    .string()
    .min(1, "Selecciona una fecha")
    .refine((value) => value <= todayIsoDate(), {
      message: "La fecha no puede ser posterior a hoy",
    }),
});

type TransactionFormInput = z.input<typeof transactionFormSchema>;
type TransactionFormValues = z.output<typeof transactionFormSchema>;

interface TransactionFormProps {
  categories: Category[];
  paymentMethods: PaymentMethod[];
  defaultCurrency: string;
  // When set, the form edits this transaction instead of creating a new one.
  editing?: TransactionWithCategory | null;
  onSubmitTransaction: (transaction: NewTransaction) => Promise<void>;
}

export function TransactionForm({
  categories,
  paymentMethods,
  defaultCurrency,
  editing = null,
  onSubmitTransaction,
}: TransactionFormProps) {
  const isEditing = editing !== null;

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormInput, unknown, TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      currency: defaultCurrency,
      paymentMethodId: undefined,
      categoryId: undefined,
      description: "",
      date: todayIsoDate(),
    },
  });

  // Load the transaction being edited, or fall back to a blank form when
  // switching back to create mode.
  useEffect(() => {
    reset(
      editing
        ? {
            type: editing.type,
            amount: editing.amount,
            currency: editing.currency,
            paymentMethodId: editing.payment_method_id ?? undefined,
            categoryId: editing.category_id ?? undefined,
            description: editing.description,
            date: editing.date,
          }
        : {
            type: "expense",
            amount: 0,
            currency: defaultCurrency,
            paymentMethodId: undefined,
            categoryId: undefined,
            description: "",
            date: todayIsoDate(),
          },
    );
    // `defaultCurrency` is intentionally excluded: changing the view's filter
    // should not wipe a form the user is already filling in. The separate
    // effect below syncs just that field in create mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, reset]);

  // Keep the currency field in sync with the view's currency filter, so a new
  // transaction defaults to whichever currency the user is looking at. Never
  // applied while editing, which would overwrite the saved currency.
  useEffect(() => {
    if (isEditing) return;
    setValue("currency", defaultCurrency);
  }, [defaultCurrency, isEditing, setValue]);

  const selectedType = watch("type");
  const selectedCategoryId = watch("categoryId");
  const selectedCurrency = watch("currency");
  const selectedPaymentMethodId = watch("paymentMethodId");

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType],
  );

  // Only accounts held in the transaction's own currency can pay for it.
  const filteredPaymentMethods = useMemo(
    () => paymentMethods.filter((method) => method.currency === selectedCurrency),
    [paymentMethods, selectedCurrency],
  );

  const paymentMethodSelectItems = useMemo(
    () =>
      Object.fromEntries(
        filteredPaymentMethods.map((method) => [String(method.id), method.name]),
      ),
    [filteredPaymentMethods],
  );

  // Keep the selected account valid whenever the currency changes or accounts load.
  useEffect(() => {
    const stillValid = filteredPaymentMethods.some(
      (method) => method.id === selectedPaymentMethodId,
    );
    if (!stillValid) {
      setValue("paymentMethodId", filteredPaymentMethods[0]?.id as number, {
        shouldValidate: false,
      });
    }
  }, [filteredPaymentMethods, selectedPaymentMethodId, setValue]);

  const categorySelectItems = useMemo(
    () =>
      Object.fromEntries(
        filteredCategories.map((category) => [String(category.id), category.name]),
      ),
    [filteredCategories],
  );

  // Keep the selected category valid whenever the type changes or categories load.
  useEffect(() => {
    const stillValid = filteredCategories.some(
      (category) => category.id === selectedCategoryId,
    );
    if (!stillValid) {
      setValue("categoryId", filteredCategories[0]?.id as number, {
        shouldValidate: false,
      });
    }
  }, [filteredCategories, selectedCategoryId, setValue]);

  async function onSubmit(values: TransactionFormValues) {
    await onSubmitTransaction({
      amount: values.amount,
      type: values.type,
      currency: values.currency,
      categoryId: values.categoryId,
      paymentMethodId: values.paymentMethodId,
      description: values.description,
      date: values.date,
    });

    // Keep the form ready for another entry when creating; when editing, the
    // caller closes the dialog, so blanking the fields would only flicker.
    if (isEditing) return;

    reset({
      type: values.type,
      amount: 0,
      currency: values.currency,
      paymentMethodId: values.paymentMethodId,
      categoryId: values.categoryId,
      description: "",
      date: todayIsoDate(),
    });
  }

  return (
    <div className="@container">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 @sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-type">Tipo</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select
                items={TRANSACTION_TYPE_LABELS}
                value={field.value}
                onValueChange={(value) =>
                  field.onChange(value as TransactionFormValues["type"])
                }
              >
                <SelectTrigger id="transaction-type" className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">
                    {TRANSACTION_TYPE_LABELS.expense}
                  </SelectItem>
                  <SelectItem value="income">
                    {TRANSACTION_TYPE_LABELS.income}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-amount">Monto</Label>
          <Input
            id="transaction-amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-currency">Moneda</Label>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select
                items={CURRENCY_LABELS}
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="transaction-currency" className="w-full">
                  <SelectValue placeholder="Selecciona una moneda" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.currency && (
            <p className="text-xs text-destructive">{errors.currency.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transaction-category">Categoría</Label>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select
                items={categorySelectItems}
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <SelectTrigger id="transaction-category" className="w-full">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId && (
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 @sm:col-span-2">
          <Label htmlFor="transaction-payment-method">Método de pago</Label>
          <Controller
            control={control}
            name="paymentMethodId"
            render={({ field }) => (
              <Select
                items={paymentMethodSelectItems}
                value={field.value ? String(field.value) : ""}
                onValueChange={(value) => field.onChange(Number(value))}
                disabled={filteredPaymentMethods.length === 0}
              >
                <SelectTrigger id="transaction-payment-method" className="w-full">
                  <SelectValue placeholder="Selecciona un método de pago" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPaymentMethods.map((method) => (
                    <SelectItem key={method.id} value={String(method.id)}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {filteredPaymentMethods.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No hay cuentas en {selectedCurrency}. Crea una en Ajustes.
            </p>
          ) : (
            errors.paymentMethodId && (
              <p className="text-xs text-destructive">
                {errors.paymentMethodId.message}
              </p>
            )
          )}
        </div>

        <div className="flex flex-col gap-1.5 @sm:col-span-2">
          <Label htmlFor="transaction-date">Fecha</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <DatePicker
                id="transaction-date"
                value={field.value}
                onChange={field.onChange}
                max={new Date()}
                className="@sm:w-auto"
              />
            )}
          />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 @sm:col-span-2">
          <Label htmlFor="transaction-description">Descripción</Label>
          <Input
            id="transaction-description"
            placeholder="Ej. Compra en el supermercado"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

      <div className="@sm:col-span-2">
        <Button type="submit" disabled={isSubmitting} className="w-full @sm:w-auto">
          {isSubmitting
            ? "Guardando..."
            : isEditing
              ? "Guardar cambios"
              : "Agregar transacción"}
        </Button>
      </div>
      </form>
    </div>
  );
}
