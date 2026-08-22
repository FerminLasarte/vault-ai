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
import { PAYMENT_METHOD_TYPE_LABELS, PAYMENT_METHOD_TYPES } from "@/lib/labels";
import type { NewPaymentMethod, PaymentMethod, PaymentMethodType } from "@/db";

const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  type: z.enum(["bank", "cash", "wallet", "card", "other"]),
  currency: z.string().min(1, "Selecciona una moneda"),
  // Negative values are legitimate here: a credit card account starts in debt.
  initialBalance: z.coerce.number("Introduce un saldo válido"),
});

type PaymentMethodFormInput = z.input<typeof paymentMethodSchema>;
type PaymentMethodFormValues = z.output<typeof paymentMethodSchema>;

const EMPTY_METHOD: PaymentMethodFormInput = {
  name: "",
  type: "bank",
  currency: CURRENCY_CODES[0],
  initialBalance: 0,
};

const CURRENCY_ITEMS = Object.fromEntries(
  CURRENCY_CODES.map((currency) => [currency, currency]),
);

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // `null` puts the dialog in create mode.
  editing: PaymentMethod | null;
  onSubmitMethod: (method: NewPaymentMethod) => Promise<void>;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  editing,
  onSubmitMethod,
}: PaymentMethodDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormInput, unknown, PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: EMPTY_METHOD,
  });

  // Reload the form whenever the dialog opens so it reflects the row being
  // edited (or a clean slate when creating).
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            name: editing.name,
            type: editing.type,
            currency: editing.currency,
            initialBalance: editing.initial_balance,
          }
        : EMPTY_METHOD,
    );
  }, [open, editing, reset]);

  async function onSubmit(values: PaymentMethodFormValues) {
    await onSubmitMethod(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cuenta" : "Nueva cuenta"}</DialogTitle>
          <DialogDescription>
            Las cuentas se usan como método de pago al registrar transacciones.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method-name">Nombre</Label>
            <Input
              id="payment-method-name"
              placeholder="Ej. Galicia Dólares"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method-type">Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  items={PAYMENT_METHOD_TYPE_LABELS}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as PaymentMethodType)}
                >
                  <SelectTrigger id="payment-method-type" className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {PAYMENT_METHOD_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-method-currency">Moneda</Label>
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  items={CURRENCY_ITEMS}
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                >
                  <SelectTrigger id="payment-method-currency" className="w-full">
                    <SelectValue placeholder="Selecciona una moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_CODES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
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
            <Label htmlFor="payment-method-initial-balance">Saldo inicial</Label>
            <Input
              id="payment-method-initial-balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("initialBalance")}
            />
            <p className="text-xs text-muted-foreground">
              El saldo que tenía la cuenta antes de empezar a registrar movimientos
              aquí. Puede ser negativo.
            </p>
            {errors.initialBalance && (
              <p className="text-xs text-destructive">
                {errors.initialBalance.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
