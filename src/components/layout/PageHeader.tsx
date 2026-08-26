import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    // The second drag region, after the sidebar header. Together they cover the
    // width of the window's top edge, which on macOS is the only way to move
    // it: the title bar is an overlay the webview draws over. The attribute has
    // to sit on the elements the cursor actually lands on, so the empty space
    // in this row drags while the buttons in `actions` keep taking their own
    // clicks — a drag never starts from a child.
    <div
      data-tauri-drag-region
      className="flex flex-wrap items-start justify-between gap-4"
    >
      <div data-tauri-drag-region>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
