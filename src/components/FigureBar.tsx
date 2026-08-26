import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Figure {
  key: string;
  label: string;
  // Already formatted: this component decides how figures sit next to each
  // other, never what they say.
  value: string;
  // The quieter line underneath — a conversion, a share, a comparison.
  sub?: ReactNode;
  valueClassName?: string;
}

interface FigureBarProps {
  figures: Figure[];
  // Rendered as a last row inside the same card, under a rule.
  footer?: ReactNode;
  // Without the card around it, for the callers that already have one and only
  // want the row of figures.
  bare?: boolean;
}

// A row of figures that belong to one question.
//
// Shared by the two bars on the statistics screen so they cannot drift apart:
// one adds up what the user has, the other what a period moved, and reading
// them as the same kind of thing is only true while they look the same.
export function FigureBar({ figures, footer, bare = false }: FigureBarProps) {
  const content = (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:gap-0 sm:divide-x sm:divide-border",
          figures.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        )}
      >
        {figures.map((figure, index) => (
          <div
            key={figure.key}
            className={cn(
              "flex flex-col gap-0.5",
              // The dividers do the separating, so only the inner columns
              // need the breathing room around them.
              index > 0 && "sm:pl-4",
              index < figures.length - 1 && "sm:pr-4",
            )}
          >
            <span className="text-xs text-muted-foreground">{figure.label}</span>
            <span
              className={cn("text-lg font-medium tabular-nums", figure.valueClassName)}
            >
              {figure.value}
            </span>
            {figure.sub}
          </div>
        ))}
      </div>

      {footer && <div className="border-t border-border pt-3">{footer}</div>}
    </div>
  );

  if (bare) return content;

  return (
    <Card>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
