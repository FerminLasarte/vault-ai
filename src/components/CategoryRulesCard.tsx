import { useState } from "react";
import { Pencil, Plus, Trash2, Wand2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useAppData } from "@/hooks/useAppData";
import type { CategoryRuleWithCategory } from "@/db";

const ruleSchema = z.object({
  pattern: z.string().trim().min(2, "Escribe al menos dos caracteres"),
  categoryId: z.coerce.number().int().positive("Selecciona una categoría"),
});

type RuleFormInput = z.input<typeof ruleSchema>;
type RuleFormValues = z.output<typeof ruleSchema>;

export function CategoryRulesCard() {
  const {
    categories,
    categoryRules,
    isMutating,
    addCategoryRule,
    editCategoryRule,
    removeCategoryRule,
  } = useAppData();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRuleWithCategory | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RuleFormInput, unknown, RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: { pattern: "", categoryId: undefined },
  });

  function openCreate() {
    setEditing(null);
    reset({ pattern: "", categoryId: categories[0]?.id });
    setIsOpen(true);
  }

  function openEdit(rule: CategoryRuleWithCategory) {
    setEditing(rule);
    reset({ pattern: rule.pattern, categoryId: rule.category_id });
    setIsOpen(true);
  }

  async function onSubmit(values: RuleFormValues) {
    if (editing) {
      await editCategoryRule(editing.id, values);
    } else {
      await addCategoryRule(values);
    }
    setIsOpen(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reglas de categorización</CardTitle>
        <CardDescription>
          Cuando la descripción contenga el texto de una regla, la categoría se
          completa sola. Si varias coinciden, gana la más específica.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {categoryRules.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Todavía no hay reglas. Por ejemplo, «netflix» → Ocio.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {categoryRules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Wand2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{rule.pattern}</span>
                  <span className="text-muted-foreground">→</span>
                  <Badge variant="secondary">
                    {rule.category_icon} {rule.category_name}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Editar"
                    onClick={() => openEdit(rule)}
                  >
                    <Pencil />
                    <span className="sr-only">Editar regla {rule.pattern}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Eliminar"
                    disabled={isMutating}
                    onClick={() => void removeCategoryRule(rule.id)}
                  >
                    <Trash2 />
                    <span className="sr-only">Eliminar regla {rule.pattern}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={categories.length === 0}
            onClick={openCreate}
          >
            <Plus />
            Nueva regla
          </Button>
        </div>
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar regla" : "Nueva regla"}</DialogTitle>
            <DialogDescription>
              No distingue mayúsculas ni acentos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-pattern">Si la descripción contiene</Label>
              <Input id="rule-pattern" placeholder="Ej. netflix" {...register("pattern")} />
              {errors.pattern && (
                <p className="text-xs text-destructive">{errors.pattern.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rule-category">Usar la categoría</Label>
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
                    <SelectTrigger id="rule-category" className="w-full">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
