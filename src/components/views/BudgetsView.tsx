import { useMemo, useState } from "react";
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
import { BudgetDialog } from "@/components/BudgetDialog";
import { useAppData } from "@/hooks/useAppData";
import { calculateBudgetProgress } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { BUDGET_PERIOD_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { BudgetWithCategory, NewBudget } from "@/db";

export function BudgetsView() {
  const {
    budgets,
    transactions,
    categories,
    isLoading,
    isMutating,
    addBudget,
    editBudget,
    removeBudget,
  } = useAppData();

  const progress = useMemo(
    () => calculateBudgetProgress(budgets, transactions),
    [budgets, transactions],
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetWithCategory | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<BudgetWithCategory | null>(
    null,
  );

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories],
  );

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(values: NewBudget) {
    if (editing) {
      await editBudget(editing.id, values);
    } else {
      await addBudget(values);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeletion) return;
    await removeBudget(pendingDeletion.id);
    setPendingDeletion(null);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Presupuestos"
        description="Topes de gasto por categoría, mensuales o anuales."
        actions={
          <Button
            type="button"
            disabled={expenseCategories.length === 0}
            onClick={openCreate}
          >
            <Plus />
            Nuevo presupuesto
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Periodo actual</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-4 text-sm text-muted-foreground">Cargando...</p>
          ) : progress.length === 0 ? (
            <div className="flex flex-col items-start gap-3 py-4">
              <p className="text-sm text-muted-foreground">
                Todavía no definiste ningún presupuesto.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={expenseCategories.length === 0}
                onClick={openCreate}
              >
                <Plus />
                Crear el primero
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-5">
              {progress.map((entry) => (
                <li key={entry.budget.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {entry.budget.category_icon} {entry.budget.category_name}
                      </span>
                      <Badge variant="outline">
                        {BUDGET_PERIOD_LABELS[entry.budget.period]}
                      </Badge>
                      <Badge variant="outline">{entry.budget.currency}</Badge>
                      {entry.isExceeded && (
                        <Badge variant="destructive">Superado</Badge>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(entry.spent, entry.budget.currency)} /{" "}
                        {formatCurrency(entry.budget.amount, entry.budget.currency)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => {
                          setEditing(entry.budget);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil />
                        <span className="sr-only">
                          Editar presupuesto de {entry.budget.category_name}
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Eliminar"
                        onClick={() => setPendingDeletion(entry.budget)}
                      >
                        <Trash2 />
                        <span className="sr-only">
                          Eliminar presupuesto de {entry.budget.category_name}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width]",
                        entry.isExceeded ? "bg-destructive" : "bg-primary",
                      )}
                      // The bar is capped at full width; `ratio` itself stays
                      // truthful so the figures beside it can read over 100%.
                      style={{ width: `${Math.min(entry.ratio, 1) * 100}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {entry.isExceeded
                      ? `Te pasaste por ${formatCurrency(
                          Math.abs(entry.remaining),
                          entry.budget.currency,
                        )}`
                      : `Te quedan ${formatCurrency(
                          entry.remaining,
                          entry.budget.currency,
                        )}`}
                    {" · "}
                    {Math.round(entry.ratio * 100)}%
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BudgetDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editing={editing}
        categories={expenseCategories}
        onSubmitBudget={handleSubmit}
      />

      <AlertDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el tope de «{pendingDeletion?.category_name}». Tus
              transacciones no se ven afectadas.
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
