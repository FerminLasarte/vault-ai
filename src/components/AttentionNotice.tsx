import { AlertTriangle, HardDriveDownload, Repeat, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AttentionItem, AttentionKind } from "@/lib/attention";

interface AttentionNoticeProps {
  items: AttentionItem[];
}

const ICONS: Record<AttentionKind, LucideIcon> = {
  budget: AlertTriangle,
  backup: HardDriveDownload,
  pending: Repeat,
};

// One block for everything the screen has to raise, however many things that
// is. Three separate cards for three separate warnings is how the screen used
// to open, and it pushed the first real figure below the fold.
//
// The card takes a destructive frame when anything in it is critical: the
// frame answers "is something wrong?" at a glance, and the rows answer "what".
//
// Through `ring`, not `border`. Card draws its own edge as `ring-1
// ring-foreground/10` and has no border width at all, so the
// `border-destructive/50` the three separate notices used to carry only ever
// set a colour on an edge that was never drawn — it looked deliberate in the
// markup and did nothing on screen.
export function AttentionNotice({ items }: AttentionNoticeProps) {
  if (items.length === 0) return null;

  const hasCritical = items.some((item) => item.tone === "critical");

  return (
    <Card className={cn(hasCritical && "ring-destructive/40")}>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const Icon = ICONS[item.kind];

          return (
            <div
              key={item.kind}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  item.tone === "critical" ? "text-destructive" : "text-muted-foreground",
                )}
              />
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-sm text-muted-foreground">{item.detail}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
