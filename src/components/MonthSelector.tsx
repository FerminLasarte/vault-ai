import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRecentMonthKeys } from "@/lib/finance";
import { formatMonthLabel } from "@/lib/format";

interface MonthSelectorProps {
  value: string;
  onChange: (monthKey: string) => void;
  monthsBack?: number;
}

export function MonthSelector({ value, onChange, monthsBack = 12 }: MonthSelectorProps) {
  const months = getRecentMonthKeys(monthsBack).slice().reverse();
  const items = Object.fromEntries(
    months.map((monthKey) => [monthKey, formatMonthLabel(monthKey)]),
  );

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(monthKey) => {
        if (monthKey) onChange(monthKey);
      }}
    >
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="Selecciona un mes" />
      </SelectTrigger>
      <SelectContent>
        {months.map((monthKey) => (
          <SelectItem key={monthKey} value={monthKey}>
            {formatMonthLabel(monthKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
