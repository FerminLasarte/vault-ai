import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRENCY_CODES } from "@/lib/currency";

interface CurrencyFilterProps {
  value: string;
  onChange: (currency: string) => void;
}

export function CurrencyFilter({ value, onChange }: CurrencyFilterProps) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(String(next))}>
      <TabsList>
        {CURRENCY_CODES.map((currency) => (
          <TabsTrigger key={currency} value={currency}>
            {currency}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
