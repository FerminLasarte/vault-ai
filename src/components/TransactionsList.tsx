import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import type { TransactionWithCategory } from "@/db/schema";

interface TransactionsListProps {
  transactions: TransactionWithCategory[];
  isLoading: boolean;
}

export function TransactionsList({ transactions, isLoading }: TransactionsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transacciones recientes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no hay transacciones.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-normal">Fecha</th>
                  <th className="py-2 pr-4 font-normal">Descripción</th>
                  <th className="py-2 pr-4 font-normal">Categoría</th>
                  <th className="py-2 pr-4 font-normal">Tipo</th>
                  <th className="py-2 pl-4 text-right font-normal">Monto</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-col gap-1">
                        <span>{transaction.description}</span>
                        <div className="flex flex-wrap gap-1">
                          {transaction.payment_method_name && (
                            <Badge variant="secondary">
                              {transaction.payment_method_name}
                            </Badge>
                          )}
                          <Badge variant="outline">{transaction.currency}</Badge>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {transaction.category_name ?? "Sin categoría"}
                    </td>
                    <td className="py-2 pr-4">
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                    </td>
                    <td
                      className={cn(
                        "py-2 pl-4 text-right font-medium whitespace-nowrap",
                        transaction.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
