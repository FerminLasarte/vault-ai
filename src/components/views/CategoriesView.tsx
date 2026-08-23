import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ActionButton";
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
import { CategoryDialog } from "@/components/CategoryDialog";
import { CategoryRulesCard } from "@/components/CategoryRulesCard";
import { useAppData } from "@/hooks/useAppData";
import { CATEGORY_TYPE_LABELS } from "@/lib/labels";
import type { Category, CategoryType, NewCategory } from "@/db";

const GROUPS: { type: CategoryType; title: string }[] = [
  { type: "income", title: "Categorías de ingreso" },
  { type: "expense", title: "Categorías de gasto" },
];

export function CategoriesView() {
  const { categories, isLoading, isMutating, addCategory, editCategory, removeCategory } =
    useAppData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Category | null>(null);

  const grouped = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: categories.filter((category) => category.type === group.type),
      })),
    [categories],
  );

  function openCreateDialog() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEditDialog(category: Category) {
    setEditing(category);
    setIsFormOpen(true);
  }

  async function handleSubmitCategory(values: NewCategory) {
    if (editing) {
      await editCategory(editing.id, values);
    } else {
      await addCategory(values);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDeletion) return;
    await removeCategory(pendingDeletion.id);
    setPendingDeletion(null);
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Categorías"
        description="Organiza tus ingresos y gastos."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus />
            Nueva categoría
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-muted-foreground">Todavía no tienes categorías.</p>
            <Button type="button" variant="outline" onClick={openCreateDialog}>
              <Plus />
              Agregar la primera
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grouped.map(({ type, title, items }) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">
                    Sin categorías de este tipo.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {items.map((category) => (
                      <li
                        key={category.id}
                        className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="text-lg leading-none">{category.icon}</span>
                          <span className="truncate text-sm font-medium">
                            {category.name}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <ActionButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Editar"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil />
                            <span className="sr-only">Editar {category.name}</span>
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            label="Eliminar"
                            onClick={() => setPendingDeletion(category)}
                          >
                            <Trash2 />
                            <span className="sr-only">Eliminar {category.name}</span>
                          </ActionButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryRulesCard />

      <CategoryDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        editing={editing}
        onSubmitCategory={handleSubmitCategory}
      />

      <AlertDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeletion?.name}» (
              {pendingDeletion ? CATEGORY_TYPE_LABELS[pendingDeletion.type] : ""}). Las
              transacciones ya registradas se conservan, pero quedarán sin categoría
              asociada.
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
