import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  // Why the list is empty, in the words of whatever it lists. Worth writing
  // per section: "todavía no hay recurrentes" teaches nothing on its own, while
  // naming an example does.
  message: string;
  actionLabel: string;
  onAction: () => void;
  // Some sections cannot create yet — a budget needs a category to cap.
  disabled?: boolean;
  className?: string;
}

// The first thing a section says when it has nothing to show, and the way out
// of it in the same breath.
//
// Left-aligned rather than centred: it sits where the first row would have
// been, so arriving at it does not feel like a different screen.
export function EmptyState({
  message,
  actionLabel,
  onAction,
  disabled = false,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 py-4", className)}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" disabled={disabled} onClick={onAction}>
        <Plus />
        {actionLabel}
      </Button>
    </div>
  );
}
