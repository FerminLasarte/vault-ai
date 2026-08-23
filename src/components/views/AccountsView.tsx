import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ActionButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentMethodDialog } from "@/components/PaymentMethodDialog";
import { ExchangeRateBar } from "@/components/ExchangeRateBar";
import { useAppData } from "@/hooks/useAppData";
import {
  calculateAccountBalances,
  consolidateByCurrency,
  totalBalanceByCurrency,
} from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { outstandingByCurrency } from "@/lib/installments";
import { PAYMENT_METHOD_TYPE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { NewPaymentMethod, PaymentMethod } from "@/db";

export function AccountsView() {
  const {
    paymentMethods,
    transactions,
    installmentPlans,
    exchangeRate,
    isLoading,
    isMutating,
    addPaymentMethod,
    editPaymentMethod,
    removePaymentMethod,
  } = useAppData();

  // Balances are derived, never stored: recomputing them from the movements
  // keeps them correct after any edit or deletion, with nothing to resync.
  const balances = useMemo(
    () => calculateAccountBalances(paymentMethods, transactions),
    [paymentMethods, transactions],
  );

  const totalsByCurrency = useMemo(
    () => totalBalanceByCurrency(paymentMethods, balances),
    [paymentMethods, balances],
  );

  const currencyTotals = useMemo(() => Array.from(totalsByCurrency), [totalsByCurrency]);

  const debtByCurrency = useMemo(
    () => outstandingByCurrency(installmentPlans),
    [installmentPlans],
  );

  const debtArs = useMemo(
    () => consolidateByCurrency(debtByCurrency, "ARS", exchangeRate?.sell ?? 0),
    [debtByCurrency, exchangeRate],
  );

  // Null whenever there is no usable rate yet, which the card reports instead
  // of showing a total that silently leaves one currency out.
  const netWorthArs = useMemo(
    () => consolidateByCurrency(totalsByCurrency, "ARS", exchangeRate?.sell ?? 0),
    [totalsByCurrency, exchangeRate],
  );

  const netWorthUsd = useMemo(
    () => consolidateByCurrency(totalsByCurrency, "USD", exchangeRate?.sell ?? 0),
    [totalsByCurrency, exchangeRate],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PaymentMethod | null>(null);

  function openCreateDialog() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEditDialog(method: PaymentMethod) {
    setEditing(method);
    setIsFormOpen(true);
  }

  async function handleSubmitMethod(values: NewPaymentMethod) {
    if (editing) {
      await editPaymentMethod(editing.id, values);
    } else {
      await addPaymentMethod(values);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeletion) return;
    await removePaymentMethod(pendingDeletion.id);
    setPendingDeletion(null);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Cuentas"
        description="Gestiona tus cuentas y métodos de pago."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus />
            Nueva cuenta
          </Button>
        }
      />

      {!isLoading && currencyTotals.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currencyTotals.map(([currency, total]) => (
              <Card key={currency}>
                <CardHeader>
                  <CardDescription>Total en {currency}</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(total, currency)}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}

            <Card>
              <CardHeader>
                <CardDescription>Patrimonio bruto</CardDescription>
                <CardTitle className="text-2xl">
                  {netWorthArs === null ? "—" : formatCurrency(netWorthArs, "ARS")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {netWorthUsd === null
                    ? "Necesita una cotización para consolidar"
                    : `≈ ${formatCurrency(netWorthUsd, "USD")}`}
                </p>
              </CardHeader>
            </Card>
          </div>

          {/* Shown only when there is debt: an always-visible pair of zeroes
              would add noise for anyone who never buys in instalments. */}
          {debtArs !== null && debtArs > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardDescription>Deuda pendiente</CardDescription>
                  <CardTitle className="text-2xl text-red-600 dark:text-red-400">
                    {formatCurrency(debtArs, "ARS")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Cuotas que todavía no registraste
                  </p>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Patrimonio neto</CardDescription>
                  <CardTitle className="text-2xl">
                    {netWorthArs === null
                      ? "—"
                      : formatCurrency(netWorthArs - debtArs, "ARS")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Bruto menos la deuda pendiente
                  </p>
                </CardHeader>
              </Card>
            </div>
          )}

          <ExchangeRateBar />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cuentas y métodos de pago</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : paymentMethods.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Todavía no tienes cuentas registradas.
              </p>
              <Button type="button" variant="outline" onClick={openCreateDialog}>
                <Plus />
                Agregar la primera
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col">
              {paymentMethods.map((method) => (
                <li
                  key={method.id}
                  className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium">{method.name}</span>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {PAYMENT_METHOD_TYPE_LABELS[method.type]}
                      </Badge>
                      <Badge variant="outline">{method.currency}</Badge>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      (balances.get(method.id) ?? 0) < 0 &&
                        "text-red-600 dark:text-red-400",
                    )}
                  >
                    {formatCurrency(balances.get(method.id) ?? 0, method.currency)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1">
                    <ActionButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      label="Editar"
                      onClick={() => openEditDialog(method)}
                    >
                      <Pencil />
                      <span className="sr-only">Editar {method.name}</span>
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      label="Eliminar"
                      onClick={() => setPendingDeletion(method)}
                    >
                      <Trash2 />
                      <span className="sr-only">Eliminar {method.name}</span>
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PaymentMethodDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editing={editing}
        onSubmitMethod={handleSubmitMethod}
      />

      <AlertDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeletion?.name}». Las transacciones ya registradas se
              conservan, pero quedarán sin método de pago asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isMutating}
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
