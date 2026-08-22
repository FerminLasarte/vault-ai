import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { CurrencyFilter } from "@/components/CurrencyFilter";
import { CategorySelect } from "@/components/filters/CategorySelect";
import { DateRangePicker, EMPTY_DATE_RANGE } from "@/components/DateRangePicker";
import { TransactionForm } from "@/components/TransactionForm";
import { useAppData } from "@/hooks/useAppData";
import { applyTransactionFilters } from "@/lib/finance";
import { formatCurrency, formatDate } from "@/lib/format";
import { TRANSACTION_TYPE_LABELS } from "@/lib/labels";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { TransactionWithCategory } from "@/db";

// Rendering thousands of rows at once is what makes the table crawl; a page
// worth of them is plenty for scanning and keeps the DOM small.
const PAGE_SIZE = 50;

// An empty amount input should mean "no bound", not zero.
function parseAmountBound(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

// A cross-currency transfer has two different figures (pesos out, dollars in),
// so showing only one of them would misrepresent the movement.
function TransferAmount({ transaction }: { transaction: TransactionWithCategory }) {
  const destinationAmount = transaction.destination_amount;
  const destinationCurrency =
    transaction.destination_currency ?? transaction.currency;

  const sent = formatCurrency(transaction.amount, transaction.currency);

  // Same currency and same figure means both legs read identically, so showing
  // the arrow twice would only add noise.
  if (
    destinationAmount === null ||
    (destinationAmount === transaction.amount &&
      destinationCurrency === transaction.currency)
  ) {
    return <span className="text-muted-foreground">{sent}</span>;
  }

  return (
    <span className="text-muted-foreground">
      {sent}
      {" → "}
      {formatCurrency(destinationAmount, destinationCurrency)}
    </span>
  );
}

export function TransactionsView() {
  const {
    transactions,
    categories,
    paymentMethods,
    isLoading,
    isMutating,
    addTransaction,
    editTransaction,
    removeTransaction,
  } = useAppData();

  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionWithCategory | null>(null);
  const [pendingDeletion, setPendingDeletion] =
    useState<TransactionWithCategory | null>(null);

  const filtered = useMemo(
    () =>
      applyTransactionFilters(transactions, {
        currency,
        search,
        categoryId,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        minAmount: parseAmountBound(minAmount),
        maxAmount: parseAmountBound(maxAmount),
      }),
    [transactions, currency, search, categoryId, dateRange, minAmount, maxAmount],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // Narrowing the filters can leave the current page past the end of the
  // results, which would show an empty table over a non-empty result set.
  const safePage = Math.min(page, pageCount - 1);

  const visible = useMemo(
    () => filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE),
    [filtered, safePage],
  );

  // Any change to the filters starts the listing over at the first page.
  useEffect(() => {
    setPage(0);
  }, [currency, search, categoryId, dateRange, minAmount, maxAmount]);

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

  async function handleConfirmDelete() {
    if (!pendingDeletion) return;
    await removeTransaction(pendingDeletion.id);
    setPendingDeletion(null);
  }

  function resetFilters() {
    setSearch("");
    setCategoryId(null);
    setDateRange(EMPTY_DATE_RANGE);
    setMinAmount("");
    setMaxAmount("");
  }

  const hasActiveFilters =
    search !== "" ||
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

          <div className="flex min-w-56 flex-col gap-1.5">
            <Label htmlFor="transactions-search">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="transactions-search"
                placeholder="Descripción..."
                className="pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
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
                      <TableHead className="w-20">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.type === "transfer"
                            ? "—"
                            : transaction.category_name
                              ? `${transaction.category_icon ?? ""} ${transaction.category_name}`.trim()
                              : "Sin categoría"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {transaction.payment_method_name ? (
                              <Badge variant="secondary">
                                {transaction.payment_method_name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {transaction.type === "transfer" && (
                              <>
                                <ArrowRight className="size-3 text-muted-foreground" />
                                {transaction.destination_payment_method_name ? (
                                  <Badge variant="secondary">
                                    {transaction.destination_payment_method_name}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {TRANSACTION_TYPE_LABELS[transaction.type]}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right font-medium whitespace-nowrap",
                            transaction.type === "income" &&
                              "text-emerald-600 dark:text-emerald-400",
                            transaction.type === "expense" &&
                              "text-red-600 dark:text-red-400",
                          )}
                        >
                          {transaction.type === "transfer" ? (
                            <TransferAmount transaction={transaction} />
                          ) : (
                            <>
                              {transaction.type === "income" ? "+" : "-"}
                              {formatCurrency(
                                transaction.amount,
                                transaction.currency,
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
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
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="Eliminar"
                              onClick={() => setPendingDeletion(transaction)}
                            >
                              <Trash2 />
                              <span className="sr-only">
                                Eliminar {transaction.description}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
                <p className="text-xs text-muted-foreground">
                  {filtered.length}{" "}
                  {filtered.length === 1 ? "transacción" : "transacciones"}
                  {pageCount > 1 &&
                    ` · mostrando ${safePage * PAGE_SIZE + 1}-${
                      safePage * PAGE_SIZE + visible.length
                    }`}
                </p>

                {pageCount > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      title="Página anterior"
                      disabled={safePage === 0}
                      onClick={() => setPage(safePage - 1)}
                    >
                      <ChevronLeft />
                      <span className="sr-only">Página anterior</span>
                    </Button>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {safePage + 1} / {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      title="Página siguiente"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => setPage(safePage + 1)}
                    >
                      <ChevronRight />
                      <span className="sr-only">Página siguiente</span>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeletion(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta transacción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDeletion?.description}» del{" "}
              {pendingDeletion ? formatDate(pendingDeletion.date) : ""}. Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isMutating}
              onClick={handleConfirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
