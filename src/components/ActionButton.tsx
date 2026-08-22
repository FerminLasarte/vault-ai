import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActionButtonProps extends Omit<ComponentProps<typeof Button>, "title"> {
  // The hover text. Kept short: it names the action, while the richer
  // screen-reader name stays in the button's own sr-only child, where it can
  // say which row it belongs to.
  label: string;
}

// A button whose hover text is drawn by the app rather than by the operating
// system. The native `title` attribute takes about a second to appear, cannot
// be styled, and ignores the app's theme — all of which reads as unfinished
// next to the rest of the interface.
export function ActionButton({ label, children, ...props }: ActionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button {...props} />}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
