// Where a suggestion goes.
//
// The app has no server and no account, and it promises the data stays on the
// machine. So nothing is ever sent from here: the message the user writes is
// handed to their own mail client, already addressed and written, and they are
// the ones who press send. It costs one extra click and it keeps the promise —
// delivering it directly would mean an endpoint of ours in the middle, which is
// a different app from the one this claims to be.
//
// Mirrors the address in package.json. One constant, so changing where
// suggestions land is a one-line change.
const FEEDBACK_ADDRESS = "fermin.lasarte@icloud.com";

export interface SuggestionContext {
  version: string;
  os: string;
}

// The two facts that are tedious to ask for afterwards and impossible to guess
// travel with the message, under a separator so they never look like part of
// what the person wrote.
export function suggestionBody(message: string, context: SuggestionContext): string {
  return [message.trim(), "", "---", `Vault ${context.version} · ${context.os}`].join(
    "\n",
  );
}

function suggestionSubject(): string {
  return "Sugerencia para Vault";
}

// Built by hand rather than with URLSearchParams: that encodes a space as "+",
// which several mail clients show literally in the body of a mailto.
export function buildSuggestionMailto(
  message: string,
  context: SuggestionContext,
): string {
  const subject = encodeURIComponent(suggestionSubject());
  const body = encodeURIComponent(suggestionBody(message, context));

  return `mailto:${FEEDBACK_ADDRESS}?subject=${subject}&body=${body}`;
}
