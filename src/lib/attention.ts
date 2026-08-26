import type { BackupStatus } from "@/lib/backupReminder";
import type { BudgetProgress } from "@/lib/finance";

// What the statistics screen needs to tell the user before it shows them a
// single figure.
//
// These used to be three separate cards stacked one on top of another, each
// with its own heading and its own border. Three of them can be true at once,
// which pushed every actual number below the fold and made the screen open
// with a wall of warnings. Deciding *what* to say is kept here, apart from the
// drawing, so the wording and the priorities can be tested without a DOM.

export type AttentionTone = "critical" | "neutral";

export type AttentionKind = "budget" | "backup" | "pending";

export interface AttentionItem {
  kind: AttentionKind;
  tone: AttentionTone;
  // The headline: what happened.
  title: string;
  // What to do about it, or where to go. Never repeats the title.
  detail: string;
}

function budgetItem(overspent: BudgetProgress[]): AttentionItem | null {
  if (overspent.length === 0) return null;

  return {
    kind: "budget",
    tone: "critical",
    title:
      overspent.length === 1
        ? "Superaste un presupuesto"
        : `Superaste ${overspent.length} presupuestos`,
    detail: overspent
      .map((entry) => `${entry.budget.category_name} (${Math.round(entry.ratio * 100)}%)`)
      .join(" · "),
  };
}

function backupItem(backup: BackupStatus): AttentionItem | null {
  if (!backup.isOverdue) return null;

  return {
    kind: "backup",
    tone: "critical",
    title:
      backup.daysAgo === null
        ? "Nunca guardaste una copia de seguridad"
        : `Hace ${backup.daysAgo} días que no guardás una copia`,
    detail: "Tus datos viven solo en este equipo. Guardá una desde Ajustes.",
  };
}

function pendingItem(pendingCount: number): AttentionItem | null {
  if (pendingCount <= 0) return null;

  return {
    kind: "pending",
    tone: "neutral",
    title:
      pendingCount === 1
        ? "Tenés 1 movimiento pendiente de confirmar"
        : `Tenés ${pendingCount} movimientos pendientes de confirmar`,
    detail: "Revisalos en Compromisos.",
  };
}

// Ordered by how much it costs to ignore each one: money already spent, then
// data that could be lost, then work still to do. The order is fixed rather
// than sorted by tone, so the same situation always reads the same way.
export function buildAttentionItems(sources: {
  overspent: BudgetProgress[];
  backup: BackupStatus;
  pendingCount: number;
}): AttentionItem[] {
  return [
    budgetItem(sources.overspent),
    backupItem(sources.backup),
    pendingItem(sources.pendingCount),
  ].filter((item): item is AttentionItem => item !== null);
}
