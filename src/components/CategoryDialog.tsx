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
import { CATEGORY_TYPE_LABELS } from "@/lib/labels";
import { DEFAULT_CATEGORY_EMOJI, EMOJI_SUGGESTIONS, isSingleEmoji } from "@/lib/emoji";
import { cn } from "@/lib/utils";
import type { Category, NewCategory } from "@/db";

const DEFAULT_COLOR = "#64748b";

const categorySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  type: z.enum(["income", "expense"]),
  icon: z
    .string()
    .trim()
    .min(1, "Elige un emoji")
    .refine(isSingleEmoji, { message: "Debe ser un único emoji" }),
  color: z.string().min(1),
});

type CategoryFormValues = z.output<typeof categorySchema>;

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // `null` puts the dialog in create mode.
  editing: Category | null;
  onSubmitCategory: (category: NewCategory) => Promise<void>;
}

export function CategoryDialog({
  open,
  onOpenChange,
  editing,
  onSubmitCategory,
}: CategoryDialogProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues, unknown, CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      icon: DEFAULT_CATEGORY_EMOJI,
      color: DEFAULT_COLOR,
    },
  });

  const selectedIcon = watch("icon");

  // Reload the form whenever the dialog opens so it reflects the row being
  // edited (or a clean slate when creating).
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            name: editing.name,
            type: editing.type,
            icon: editing.icon || DEFAULT_CATEGORY_EMOJI,
            color: editing.color || DEFAULT_COLOR,
          }
        : {
            name: "",
            type: "expense",
            icon: DEFAULT_CATEGORY_EMOJI,
            color: DEFAULT_COLOR,
          },
    );
  }, [open, editing, reset]);

  async function onSubmit(values: CategoryFormValues) {
    await onSubmitCategory({ ...values, icon: values.icon.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            Las categorías agrupan tus transacciones en los informes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-name">Nombre</Label>
            <Input
              id="category-name"
              placeholder="Ej. Supermercado"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-type">Tipo</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  items={CATEGORY_TYPE_LABELS}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value)}
                >
                  <SelectTrigger id="category-type" className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">
                      {CATEGORY_TYPE_LABELS.expense}
                    </SelectItem>
                    <SelectItem value="income">{CATEGORY_TYPE_LABELS.income}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-icon">Emoji</Label>
            <Input
              id="category-icon"
              className="w-20 text-center text-lg"
              maxLength={8}
              {...register("icon")}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={`Usar ${emoji}`}
                  onClick={() => setValue("icon", emoji, { shouldValidate: true })}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-base transition-colors hover:bg-muted",
                    selectedIcon === emoji && "bg-muted ring-1 ring-foreground/10",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {errors.icon && (
              <p className="text-xs text-destructive">{errors.icon.message}</p>
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
