import { useEffect, useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertTransaction, listCategories, type Category } from "@/db";

const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("El monto debe ser mayor que 0"),
  categoryId: z.coerce.number().int().positive("Selecciona una categoría"),
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  date: z.string().min(1, "Selecciona una fecha"),
});

type TransactionFormInput = z.input<typeof transactionFormSchema>;
type TransactionFormValues = z.output<typeof transactionFormSchema>;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

interface TransactionFormProps {
  onTransactionCreated?: () => void;
}

export function TransactionForm({ onTransactionCreated }: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch((error) => {
        console.error("Failed to load categories:", error);
      });
  }, []);

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
      categoryId: undefined,
      description: "",
      date: todayIsoDate(),
    },
  });

  const selectedType = watch("type");
  const selectedCategoryId = watch("categoryId");

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === selectedType),
    [categories, selectedType],
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
    await insertTransaction({
      amount: values.amount,
      type: values.type,
      categoryId: values.categoryId,
      paymentMethod: "cash",
      description: values.description,
      date: values.date,
    });

    reset({
      type: values.type,
      amount: 0,
      categoryId: values.categoryId,
      description: "",
      date: todayIsoDate(),
    });

    onTransactionCreated?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva transacción</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-type">Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    field.onChange(value as TransactionFormValues["type"])
                  }
                >
                  <SelectTrigger id="transaction-type" className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
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
            <Label htmlFor="transaction-category">Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transaction-date">Fecha</Label>
            <Input id="transaction-date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
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

          <div className="sm:col-span-2">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Guardando..." : "Agregar transacción"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
