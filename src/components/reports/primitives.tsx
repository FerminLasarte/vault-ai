import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";

// The furniture every printed document shares.
//
// Deliberately tables rather than the charts on screen. A Recharts SVG sizes
// itself from its container, which on paper is whatever the print engine
// decided, and a donut printed in greyscale conveys less than the numbers it
// was drawn from.

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    // `break-inside-avoid` keeps a table from being split across two sheets,
    // which is the difference between a report and a pile of paper.
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full border-collapse text-xs">{children}</table>;
}

export const CELL = "border-b border-black/10 py-1 text-left";
export const NUMBER = "border-b border-black/10 py-1 text-right tabular-nums";

interface PrintableDocumentProps {
  title: string;
  // The lines under the title that say what this is a document *of*. A printout
  // that does not state its period and currency is a page of numbers nobody can
  // check later.
  meta: ReactNode;
  generatedAt: string;
  children: ReactNode;
}

// Deliberately does not hide itself. The print stylesheet keys off the
// `#printable-report` id (see src/index.css) and force-hides everything else
// with `display: none !important`, which no utility class can outrank — so the
// page owns that wrapper and renders exactly one document inside it. The print
// engine takes the whole window, and two documents left visible to it would
// come out of the printer stapled together.
export function PrintableDocument({
  title,
  meta,
  generatedAt,
  children,
}: PrintableDocumentProps) {
  return (
    <>
      <header className="border-b border-black/20 pb-3">
        <h1 className="font-heading text-lg font-semibold tracking-tight">{title}</h1>
        {meta}
      </header>

      {children}

      <footer className="mt-8 border-t border-black/20 pt-2 text-[10px]">
        Generado el {formatDate(generatedAt.slice(0, 10))} · Vault
      </footer>
    </>
  );
}
