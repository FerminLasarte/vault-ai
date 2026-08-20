import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@/db";

const ALL_VALUE = "all";

interface CategorySelectProps {
  id?: string;
  categories: Category[];
  // `null` means "all categories".
  value: number | null;
  onChange: (categoryId: number | null) => void;
  className?: string;
}

export function CategorySelect({
  id,
  categories,
  value,
  onChange,
  className,
}: CategorySelectProps) {
  const items = useMemo(
    () => ({
      [ALL_VALUE]: "Todas las categorías",
      ...Object.fromEntries(
        categories.map((category) => [String(category.id), category.name]),
      ),
    }),
    [categories],
  );

  return (
    <Select
      items={items}
      value={value === null ? ALL_VALUE : String(value)}
      onValueChange={(next) => onChange(next === ALL_VALUE ? null : Number(next))}
    >
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder="Todas las categorías" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>Todas las categorías</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={String(category.id)}>
            {category.icon} {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
