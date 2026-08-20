import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAppData } from "@/hooks/useAppData";
import { PAYMENT_METHOD_TYPE_LABELS } from "@/lib/labels";
import type { NewPaymentMethod, PaymentMethod } from "@/db";

export function AccountsView() {
  const {
    paymentMethods,
    isLoading,
    isMutating,
    addPaymentMethod,
    editPaymentMethod,
    removePaymentMethod,
  } = useAppData();

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

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Editar"
                      onClick={() => openEditDialog(method)}
                    >
                      <Pencil />
                      <span className="sr-only">Editar {method.name}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Eliminar"
                      onClick={() => setPendingDeletion(method)}
                    >
                      <Trash2 />
                      <span className="sr-only">Eliminar {method.name}</span>
                    </Button>
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
              Se eliminará «{pendingDeletion?.name}». Las transacciones ya registradas
              se conservan, pero quedarán sin método de pago asociado.
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
