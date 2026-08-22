import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ActionButton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate, parseIsoDate, toIsoDate } from "@/lib/format";

export interface DateRange {
  from: string | null;
  to: string | null;
}

export const EMPTY_DATE_RANGE: DateRange = { from: null, to: null };

interface DateRangePickerProps {
  id?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}

function formatRangeLabel({ from, to }: DateRange): string | null {
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `Desde ${formatDate(from)}`;
  if (to) return `Hasta ${formatDate(to)}`;
  return null;
}

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder = "Cualquier fecha",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const label = formatRangeLabel(value);
  const hasValue = label !== null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="justify-start gap-2 font-normal"
            />
          }
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          {hasValue ? label : <span className="text-muted-foreground">{placeholder}</span>}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="range"
            selected={{
              from: value.from ? parseIsoDate(value.from) : undefined,
              to: value.to ? parseIsoDate(value.to) : undefined,
            }}
            defaultMonth={value.from ? parseIsoDate(value.from) : undefined}
            onSelect={(range) =>
              onChange({
                from: range?.from ? toIsoDate(range.from) : null,
                to: range?.to ? toIsoDate(range.to) : null,
              })
            }
            locale={es}
            numberOfMonths={2}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      {hasValue && (
        <ActionButton
          type="button"
          variant="ghost"
          size="icon-sm"
          label="Limpiar fechas"
          onClick={() => onChange(EMPTY_DATE_RANGE)}
        >
          <X />
          <span className="sr-only">Limpiar fechas</span>
        </ActionButton>
      )}
    </div>
  );
}
