import type { ReactNode } from "react";

// The one element the print stylesheet keeps.
//
// `src/index.css` hides every sibling of this with `display: none !important`,
// which no utility class can outrank, and finds this one by its id. So exactly
// one may be mounted at a time — two would be invalid HTML and would come out
// of the printer stapled together — and a screen that prints more than one kind
// of document swaps what is inside rather than mounting a second sheet.
export function PrintableSheet({ children }: { children: ReactNode }) {
  return (
    <div id="printable-report" className="hidden print:block">
      {children}
    </div>
  );
}
