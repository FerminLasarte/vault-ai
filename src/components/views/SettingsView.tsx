import { useEffect, useRef, useState } from "react";
import { CalendarClock, Download, HardDriveDownload, Upload } from "lucide-react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { checkpointDatabase } from "@/db";
import { useAppData } from "@/hooks/useAppData";
import { useTheme } from "@/hooks/useTheme";
import { buildImportPlan, parseCsv, transactionsToCsv } from "@/lib/csv";
import { CURRENCY_CODES } from "@/lib/currency";
import { openCsvFile, saveCsvFile, saveDatabaseCopy } from "@/lib/files";
import { formatDate, todayIsoDate } from "@/lib/format";
import {
  isRateType,
  RATE_TYPE_DESCRIPTIONS,
  RATE_TYPE_LABELS,
  RATE_TYPES,
} from "@/lib/exchangeRate";
import { backupStatus } from "@/lib/backupReminder";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/context/ThemeContext";
import type { ImportSkip } from "@/lib/csv";
import type { ViewProps } from "@/lib/menu";

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

interface ImportOutcome {
  imported: number;
  duplicates: number;
  skipped: ImportSkip[];
}

export function SettingsView({ request }: ViewProps) {
  const {
    transactions,
    categories,
    categoryRules,
    paymentMethods,
    importTransactions,
    isMutating,
    exchangeRateHistory,
    isRefreshingRate,
    backfillExchangeRates,
    lastBackupAt,
    recordBackup,
    rateType,
    setRateType,
  } = useAppData();
  const { preference, setPreference } = useTheme();

  const [databasePath, setDatabasePath] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  useEffect(() => {
    // `join` rather than string concatenation: appDataDir() comes back without
    // a trailing separator, so a template literal glues the folder and the file
    // name into one nonexistent path.
    appDataDir()
      // Still the pre-rename file name; see the note in src/db/index.ts.
      .then((dir) => join(dir, "vault-ai.db"))
      .then(setDatabasePath)
      .catch(() => setDatabasePath(null));
  }, []);

  async function handleExportCsv() {
    setIsWorking(true);
    try {
      const saved = await saveCsvFile(
        `vault-${todayIsoDate()}.csv`,
        transactionsToCsv(transactions),
      );
      if (saved) toast.success(`${transactions.length} transacciones exportadas`);
    } catch (error) {
      console.error("Failed to export the transactions:", error);
      toast.error("No se pudo exportar el archivo");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleBackup() {
    setIsWorking(true);
    try {
      // Without this the copy would miss whatever is still in the -wal sidecar.
      await checkpointDatabase();
      const saved = await saveDatabaseCopy(`vault-${todayIsoDate()}.db`);
      if (saved) {
        await recordBackup();
        toast.success("Copia de seguridad guardada");
      }
    } catch (error) {
      console.error("Failed to back up the database:", error);
      toast.error("No se pudo guardar la copia");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleImportCsv() {
    setIsWorking(true);
    setOutcome(null);
    try {
      const contents = await openCsvFile();
      if (contents === null) return;

      const plan = buildImportPlan(parseCsv(contents), {
        categories,
        categoryRules,
        accounts: paymentMethods,
        existing: transactions,
        supportedCurrencies: CURRENCY_CODES,
      });

      if (plan.ready.length > 0) {
        await importTransactions(plan.ready);
      }

      setOutcome({
        imported: plan.ready.length,
        duplicates: plan.duplicates,
        skipped: plan.skipped,
      });

      if (plan.ready.length === 0) {
        toast.warning("No se importó ninguna transacción");
      }
    } catch (error) {
      console.error("Failed to import the file:", error);
      toast.error("No se pudo leer el archivo");
    } finally {
      setIsWorking(false);
    }
  }

  // The three data entries in the Archivo menu. Each opens a native file dialog
  // and then reads or writes a file, so unlike opening a dialog these genuinely
  // belong in an effect.
  //
  // A ref rather than state: which click was already handled is bookkeeping,
  // nothing renders from it, and holding it in state would schedule a render
  // for every menu click on top of the one the action itself causes.
  const lastRequestSeq = useRef(request?.seq ?? 0);
  useEffect(() => {
    if (request === null || request.seq === lastRequestSeq.current) return;
    lastRequestSeq.current = request.seq;

    const run =
      request.action === "backup"
        ? handleBackup
        : request.action === "export-csv"
          ? handleExportCsv
          : request.action === "import-csv"
            ? handleImportCsv
            : null;

    // Replaying a native menu click is a reaction to an external system, not
    // state derived from props: the handler marks itself busy and then awaits a
    // file dialog, so nothing cascades.
    if (run !== null) void run();
    // The handlers are redefined on every render and are only ever invoked in
    // response to a new sequence number, so listing them here would re-run this
    // on every render instead of once per menu click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const busy = isWorking || isMutating;

  const backup = backupStatus(lastBackupAt, transactions.length);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <PageHeader
        title="Ajustes"
        description="Apariencia, copias de seguridad e intercambio de datos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>
            «Sistema» sigue la preferencia de tu equipo automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={preference}
            onValueChange={(next) => setPreference(String(next) as ThemePreference)}
          >
            <TabsList>
              {THEME_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tus datos</CardTitle>
          <CardDescription>
            Todo vive únicamente en este equipo. Si se pierde el disco, se pierde todo: no
            hay copia en ningún servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p
            className={cn(
              "text-sm",
              backup.isOverdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {backup.daysAgo === null
              ? "Nunca guardaste una copia."
              : backup.daysAgo === 0
                ? "Última copia: hoy."
                : backup.daysAgo === 1
                  ? "Última copia: ayer."
                  : `Última copia: hace ${backup.daysAgo} días.`}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleBackup}
            >
              <HardDriveDownload />
              Guardar copia de seguridad
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || transactions.length === 0}
              onClick={handleExportCsv}
            >
              <Download />
              Exportar a CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleImportCsv}
            >
              <Upload />
              Importar desde CSV
            </Button>
          </div>

          {outcome && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">
                {outcome.imported}{" "}
                {outcome.imported === 1
                  ? "transacción importada"
                  : "transacciones importadas"}
              </p>
              {outcome.duplicates > 0 && (
                <p className="text-xs text-muted-foreground">
                  {outcome.duplicates} ya existían y se omitieron.
                </p>
              )}
              {outcome.skipped.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {outcome.skipped.length}{" "}
                    {outcome.skipped.length === 1
                      ? "fila descartada"
                      : "filas descartadas"}
                    :
                  </p>
                  <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                    {outcome.skipped.map((entry) => (
                      <li key={entry.line} className="text-xs text-muted-foreground">
                        Línea {entry.line}: {entry.reason}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones</CardTitle>
          <CardDescription>
            Con el histórico, cada movimiento se valúa a la cotización del día en que
            ocurrió, en vez de a la de hoy. Sin él, un gasto viejo parece más barato de lo
            que fue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rate-type">Qué dólar usar</Label>
            <Select
              items={RATE_TYPE_LABELS}
              value={rateType}
              onValueChange={(value) => {
                if (isRateType(value)) void setRateType(value);
              }}
            >
              <SelectTrigger id="rate-type" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {RATE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {RATE_TYPE_DESCRIPTIONS[rateType]}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {exchangeRateHistory.length === 0
              ? `Todavía no descargaste el histórico de ${RATE_TYPE_LABELS[rateType].toLowerCase()}.`
              : exchangeRateHistory.length === 1
                ? "1 cotización guardada. Traé el histórico para valuar el pasado."
                : `${exchangeRateHistory.length} cotizaciones guardadas, desde ${formatDate(
                    exchangeRateHistory[0].date,
                  )}.`}
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={isRefreshingRate}
              onClick={() => void backfillExchangeRates()}
            >
              <CalendarClock />
              {isRefreshingRate ? "Descargando..." : "Traer histórico de cotizaciones"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Base de datos</CardTitle>
          <CardDescription>Ubicación del archivo en este equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs break-all text-muted-foreground">
            {databasePath ?? "No disponible"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
