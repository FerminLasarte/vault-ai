import { useEffect, useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ActionButton";
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
import { useAppData } from "@/hooks/useAppData";
import { MANUAL_RATE_SOURCE } from "@/lib/exchangeRate";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const rateSchema = z.object({
  buy: z.coerce.number().positive("Debe ser mayor que 0"),
  sell: z.coerce.number().positive("Debe ser mayor que 0"),
});

type RateFormInput = z.input<typeof rateSchema>;
type RateFormValues = z.output<typeof rateSchema>;

export function ExchangeRateBar() {
  const {
    exchangeRate,
    isRefreshingRate,
    refreshExchangeRate,
    saveManualExchangeRate,
  } = useAppData();

  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RateFormInput, unknown, RateFormValues>({
    resolver: zodResolver(rateSchema),
    defaultValues: { buy: 0, sell: 0 },
  });

  useEffect(() => {
    if (!isEditing) return;
    reset({ buy: exchangeRate?.buy ?? 0, sell: exchangeRate?.sell ?? 0 });
  }, [isEditing, exchangeRate, reset]);

  async function onSubmit(values: RateFormValues) {
    await saveManualExchangeRate(values.buy, values.sell);
    setIsEditing(false);
  }

  const isManual = exchangeRate?.source === MANUAL_RATE_SOURCE;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {exchangeRate ? (
        <span>
          Dólar MEP {formatCurrency(exchangeRate.sell, "ARS")} ·{" "}
          {formatDate(exchangeRate.date)}
          {isManual && " · cargado a mano"}
        </span>
      ) : (
        <span>Sin cotización todavía. Conéctate a internet o cárgala a mano.</span>
      )}

      <ActionButton
        type="button"
        variant="ghost"
        size="icon-sm"
        label="Actualizar cotización"
        disabled={isRefreshingRate}
        onClick={() => void refreshExchangeRate()}
      >
        <RefreshCw className={cn(isRefreshingRate && "animate-spin")} />
        <span className="sr-only">Actualizar cotización</span>
      </ActionButton>

      <ActionButton
        type="button"
        variant="ghost"
        size="icon-sm"
        label="Corregir cotización"
        onClick={() => setIsEditing(true)}
      >
        <Pencil />
        <span className="sr-only">Corregir cotización</span>
      </ActionButton>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir cotización</DialogTitle>
            <DialogDescription>
              Se guarda con la fecha de hoy y reemplaza a la obtenida online. Se
              usa el valor de venta para convertir entre pesos y dólares.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exchange-rate-buy">Compra</Label>
              <Input
                id="exchange-rate-buy"
                type="number"
                step="0.01"
                min="0"
                {...register("buy")}
              />
              {errors.buy && (
                <p className="text-xs text-destructive">{errors.buy.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exchange-rate-sell">Venta</Label>
              <Input
                id="exchange-rate-sell"
                type="number"
                step="0.01"
                min="0"
                {...register("sell")}
              />
              {errors.sell && (
                <p className="text-xs text-destructive">{errors.sell.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
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
    </div>
  );
}
