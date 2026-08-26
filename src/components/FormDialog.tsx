import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // One line on what the form decides, or what the figures in it mean. Every
  // one of these dialogs had something worth saying here.
  description: string;
  // Already wrapped in the form's own `handleSubmit`.
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  // For the forms with two columns of fields, which need more room than the
  // default dialog gives.
  className?: string;
  // How the fields sit. "grid" is for the long forms — a loan, an instalment
  // plan — where a single column would run off the bottom of the screen.
  layout?: "stack" | "grid";
  children: ReactNode;
}

// The frame every form in a dialog was drawing for itself: header, the form
// element that carries the submit, and a footer with a way out and a way on.
//
// Cancel is a plain close rather than a reset, because the fields are reloaded
// on opening anyway — see `useDialogForm`.
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  isSubmitting,
  submitLabel = "Guardar",
  submittingLabel = "Guardando...",
  className,
  layout = "stack",
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className={
            layout === "grid"
              ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
              : "flex flex-col gap-4"
          }
        >
          {children}

          {/* The footer spans both columns of a grid form: two buttons in the
              last cell would sit under the left-hand field rather than under
              the form. */}
          <DialogFooter className={layout === "grid" ? "sm:col-span-2" : undefined}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
