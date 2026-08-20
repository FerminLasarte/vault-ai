import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { CurrencyFilter } from "@/components/CurrencyFilter";
import { CategorySelect } from "@/components/filters/CategorySelect";
import { DateRangePicker, EMPTY_DATE_RANGE } from "@/components/DateRangePicker";
import { TransactionForm } from "@/components/TransactionForm";
import { useAppData } from "@/hooks/useAppData";
import { applyTransactionFilters } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import { DEFAULT_DASHBOARD_CURRENCY } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { TransactionWithCategory } from "@/db";

// An empty amount input should mean "no bound", not zero.
function parseAmountBound(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function TransactionsView() {
  const {
    transactions,
    categories,
    paymentMethods,
    isLoading,
    addTransaction,
    editTransaction,
  } = useAppData();

  const [currency, setCurrency] = useState(DEFAULT_DASHBOARD_CURRENCY);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);

  const filtered = useMemo(
    () =>
      applyTransactionFilters(transactions, {
        currency,
        categoryId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        minAmount: parseAmountBound(minAmount),
        maxAmount: parseAmountBound(maxAmount),
      }),
    [transactions, currency, categoryId, dateRange, minAmount, maxAmount],
  );

  function openCreateDialog() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEditDialog(transaction: TransactionWithCategory) {
    setEditing(transaction);
    setIsFormOpen(true);
  }

  async function handleSubmitTransaction(values: Parameters<typeof addTransaction>[0]) {
    if (editing) {
      await editTransaction(editing.id, values);
    } else {
      await addTransaction(values);
    }
    setIsFormOpen(false);
  }

  function resetFilters() {
    setCategoryId(null);
    setDateRange(EMPTY_DATE_RANGE);
    setMinAmount("");
    setMaxAmount("");
  }

  const hasActiveFilters =
    categoryId !== null ||
    dateRange.from !== null ||
    dateRange.to !== null ||
    minAmount !== "" ||
    maxAmount !== "";

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Transacciones"
        description="Historial completo de tus movimientos."
        actions={
          <Button type="button" onClick={openCreateDialog}>
            <Plus />
            Nueva transacción
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Moneda</Label>
            <CurrencyFilter value={currency} onChange={setCurrency} />
          </div>

          <div className="flex min-w-52 flex-col gap-1.5">
            <Label htmlFor="transactions-category">Categoría</Label>
            <CategorySelect
              id="transactions-category"
              categories={categories}
              value={categoryId}
              onChange={setCategoryId}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transactions-dates">Rango de fechas</Label>
            <DateRangePicker
              id="transactions-dates"
              value={dateRange}
              onChange={setDateRange}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transactions-min-amount">Monto mínimo</Label>
            <Input
              id="transactions-min-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Sin mínimo"
              className="w-32"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transactions-max-amount">Monto máximo</Label>
            <Input
              id="transactions-max-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Sin máximo"
              className="w-32"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" onClick={resetFilters}>
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              No hay transacciones que coincidan con los filtros.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="w-10">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.category_name
                            ? `${transaction.category_icon ?? ""} ${transaction.category_name}`.trim()
                            : "Sin categoría"}
                        </TableCell>
                        <TableCell>
                          {transaction.payment_method_name ? (
                            <Badge variant="secondary">
                              {transaction.payment_method_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {TRANSACTION_TYPE_LABELS[transaction.type]}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium whitespace-nowrap",
                            transaction.type === "income"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400",
                          )}
                        >
                          {transaction.type === "income" ? "+" : "-"}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Editar"
                            onClick={() => openEditDialog(transaction)}
                          >
                            <Pencil />
                            <span className="sr-only">
                              Editar {transaction.description}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="pt-4 text-xs text-muted-foreground">
                {filtered.length}{" "}
                {filtered.length === 1 ? "transacción" : "transacciones"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar transacción" : "Nueva transacción"}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            paymentMethods={paymentMethods}
            defaultCurrency={currency}
            editing={editing}
            onSubmitTransaction={handleSubmitTransaction}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
