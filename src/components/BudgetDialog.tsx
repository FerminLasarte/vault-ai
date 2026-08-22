import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CURRENCY_CODES } from "@/lib/currency";
import { BUDGET_PERIODS, BUDGET_PERIOD_LABELS } from "@/lib/labels";
import type { BudgetPeriod, BudgetWithCategory, Category, NewBudget } from "@/db";

const budgetSchema = z.object({
  categoryId: z.coerce.number().int().positive("Selecciona una categoría"),
  currency: z.string().min(1, "Selecciona una moneda"),
  amount: z.coerce.number().positive("El tope debe ser mayor que 0"),
  period: z.enum(["monthly", "annual"]),
});

type BudgetFormInput = z.input<typeof budgetSchema>;
type BudgetFormValues = z.output<typeof budgetSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // `null` puts the dialog in create mode.
  editing: BudgetWithCategory | null;
  categories: Category[];
  onSubmitBudget: (budget: NewBudget) => Promise<void>;
}

export function BudgetDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSubmitBudget,
}: BudgetDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormInput, unknown, BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: undefined,
      currency: CURRENCY_CODES[0],
      amount: 0,
      period: "monthly",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            categoryId: editing.category_id,
            currency: editing.currency,
            amount: editing.amount,
            period: editing.period,
          }
        : {
            categoryId: categories[0]?.id,
            currency: CURRENCY_CODES[0],
            amount: 0,
            period: "monthly",
          },
    );
  }, [open, editing, categories, reset]);

  async function onSubmit(values: BudgetFormValues) {
    await onSubmitBudget(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar presupuesto" : "Nuevo presupuesto"}
          </DialogTitle>
          <DialogDescription>
            Solo cuentan los gastos de la categoría en la moneda elegida.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-category">Categoría</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(
                    categories.map((category) => [String(category.id), category.name]),
                  )}
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger id="budget-category" className="w-full">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.icon} {category.name}
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
            <Label htmlFor="budget-period">Periodo</Label>
            <Controller
              control={control}
              name="period"
              render={({ field }) => (
                <Select
                  items={BUDGET_PERIOD_LABELS}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as BudgetPeriod)}
                >
                  <SelectTrigger id="budget-period" className="w-full">
                    <SelectValue placeholder="Selecciona un periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_PERIODS.map((period) => (
                      <SelectItem key={period} value={period}>
                        {BUDGET_PERIOD_LABELS[period]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-currency">Moneda</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  items={Object.fromEntries(
                    CURRENCY_CODES.map((code) => [code, code]),
                  )}
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                >
                  <SelectTrigger id="budget-currency" className="w-full">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-amount">Tope</Label>
            <Input
              id="budget-amount"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
