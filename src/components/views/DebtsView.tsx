import { useMemo, useState } from "react";
import { Check, CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
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
import { InstallmentPlanDialog } from "@/components/InstallmentPlanDialog";
import { useAppData } from "@/hooks/useAppData";
import { collectPendingInstallments } from "@/lib/pendingInstallments";
import { outstandingAmount, outstandingByCurrency } from "@/lib/installments";
import { formatCurrency, formatDate, todayIsoDate } from "@/lib/format";
import type { InstallmentPlanWithNames, NewInstallmentPlan } from "@/db";

export function DebtsView() {
  const {
    installmentPlans,
    categories,
    paymentMethods,
    isLoading,
    isMutating,
    addInstallmentPlan,
    editInstallmentPlan,
    removeInstallmentPlan,
    confirmInstallment,
  } = useAppData();

  const pending = useMemo(
    () => collectPendingInstallments(installmentPlans, todayIsoDate()),
    [installmentPlans],
  );

  const outstanding = useMemo(
    () => Array.from(outstandingByCurrency(installmentPlans)),
    [installmentPlans],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<InstallmentPlanWithNames | null>(null);
  const [pendingDeletion, setPendingDeletion] =
    useState<InstallmentPlanWithNames | null>(null);

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(values: NewInstallmentPlan) {
    if (editing) {
      await editInstallmentPlan(editing.id, values);
    } else {
      await addInstallmentPlan(values);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeletion) return;
    await removeInstallmentPlan(pendingDeletion.id);
    setPendingDeletion(null);
  }

  async function payAll() {
    // Sequential: each confirmation advances its plan, and the next instalment
    // of the same plan depends on that having happened.
    for (const entry of pending) {
      await confirmInstallment(entry.plan.id, entry.index, entry.date, entry.amount);
    }
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Deudas"
        description="Compras en cuotas. Cada cuota se registra cuando la confirmes."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus />
            Nueva compra en cuotas
          </Button>
        }
      />

      {!isLoading && outstanding.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {outstanding.map(([currency, total]) => (
            <Card key={currency}>
              <CardHeader>
                <CardDescription>Deuda pendiente en {currency}</CardDescription>
                <CardTitle className="text-2xl">
                  {formatCurrency(total, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {pending.length === 1 ? "1 cuota vencida" : `${pending.length} cuotas vencidas`}
            </CardTitle>
            <CardDescription>
              Confirmá cada una cuando la hayas pagado.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col">
              {pending.map((entry) => (
                <li
                  key={`${entry.plan.id}-${entry.index}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-sm font-medium">
                      {entry.plan.description}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="secondary">
                        Cuota {entry.number} de {entry.plan.installment_count}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-400">
                      -{formatCurrency(entry.amount, entry.plan.currency)}
                    </span>
                    <ActionButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      label="Registrar cuota"
                      disabled={isMutating}
                      onClick={() =>
                        void confirmInstallment(
                          entry.plan.id,
                          entry.index,
                          entry.date,
                          entry.amount,
                        )
                      }
                    >
                      <Check />
                      <span className="sr-only">
                        Registrar cuota {entry.number} de {entry.plan.description}
                      </span>
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>

            {pending.length > 1 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isMutating}
                  onClick={() => void payAll()}
                >
                  <Check />
                  Registrar todas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compras en cuotas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
          ) : installmentPlans.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Todavía no cargaste ninguna compra en cuotas.
              </p>
              <Button type="button" variant="outline" onClick={openCreate}>
                <Plus />
                Cargar la primera
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {installmentPlans.map((plan) => {
                const remaining = outstandingAmount(plan);
                const paidRatio = plan.confirmed_count / plan.installment_count;
                const isSettled = plan.confirmed_count >= plan.installment_count;

                return (
                  <li key={plan.id} className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <CreditCard className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm font-medium">
                          {plan.description}
                        </span>
                        <Badge variant="secondary">
                          {plan.confirmed_count} / {plan.installment_count}
                        </Badge>
                        <Badge variant="outline">{plan.currency}</Badge>
                        {isSettled && <Badge variant="secondary">Saldada</Badge>}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(remaining, plan.currency)} pendiente
                        </span>
                        <ActionButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          label="Editar"
                          onClick={() => {
                            setEditing(plan);
                            setIsFormOpen(true);
                          }}
                        >
                          <Pencil />
                          <span className="sr-only">Editar {plan.description}</span>
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          label="Eliminar"
                          onClick={() => setPendingDeletion(plan)}
                        >
                          <Trash2 />
                          <span className="sr-only">Eliminar {plan.description}</span>
                        </ActionButton>
                      </div>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${Math.min(paidRatio, 1) * 100}%` }}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Total {formatCurrency(plan.total_amount, plan.currency)} · primera
                      cuota {formatDate(plan.first_due_date)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <InstallmentPlanDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editing={editing}
        categories={categories}
        paymentMethods={paymentMethods}
        onSubmitPlan={handleSubmit}
      />

      <AlertDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta compra en cuotas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeletion?.description}». Las cuotas que ya
              registraste se conservan como movimientos.
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
