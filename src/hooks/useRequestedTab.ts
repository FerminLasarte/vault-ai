import { useState } from "react";
import type { TabRequest } from "@/lib/navigation";

// Which tab a view is showing, when something outside the view can also ask for
// one.
//
// The tab is ordinary local state — clicking one switches it — with a single
// extra rule: a request naming one of this view's tabs wins. Requests naming
// somebody else's tab are ignored rather than clamped to a fallback, because a
// request left over from navigating elsewhere must not yank the user off the
// tab they are on.
export function useRequestedTab<T extends string>(
  request: TabRequest | null,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const requested =
    request !== null && (allowed as readonly string[]).includes(request.value)
      ? (request.value as T)
      : null;

  // Honoured on the first render too: arriving from the menu should open the
  // requested tab, not the default one and then a visible switch.
  const [current, setCurrent] = useState<T>(requested ?? fallback);
  const [handledSeq, setHandledSeq] = useState(request?.seq ?? 0);

  // Adjusted during render rather than from an effect. React re-runs the
  // component with the new value before anything is painted, so the switch is
  // never visible — where an effect would paint the old tab first and then
  // replace it. It is also the only way React 19 allows: reacting to a changed
  // prop by setting state inside an effect is a lint error by now.
  //
  // The sequence number, not the value, is what marks a request as handled:
  // asking for the tab the user just navigated away from is a real request and
  // has to be honoured again.
  if (request !== null && request.seq !== handledSeq) {
    setHandledSeq(request.seq);
    if (requested !== null) setCurrent(requested);
  }

  return [current, setCurrent];
}
