import type { CategoryRule } from "@/db/schema";
import { normalizeForSearch } from "@/lib/text";

// Returns the rule that best describes this text, or null when none applies.
//
// When several patterns match, the longest one wins: "mercado libre" is more
// specific than "mercado", and the more specific rule is the one the user meant.
// Ties break on the lower id so the outcome never depends on row ordering.
export function matchCategoryRule(
  description: string,
  rules: CategoryRule[],
): CategoryRule | null {
  const haystack = normalizeForSearch(description);
  if (haystack === "") return null;

  let best: CategoryRule | null = null;
  let bestLength = 0;

  for (const rule of rules) {
    const needle = normalizeForSearch(rule.pattern);
    // A blank pattern would match everything; treat it as disabled rather than
    // letting it swallow every transaction.
    if (needle === "" || !haystack.includes(needle)) continue;

    if (
      needle.length > bestLength ||
      (needle.length === bestLength && best !== null && rule.id < best.id)
    ) {
      best = rule;
      bestLength = needle.length;
    }
  }

  return best;
}

// Convenience wrapper for the callers that only care about where it lands.
export function matchCategoryId(
  description: string,
  rules: CategoryRule[],
): number | null {
  return matchCategoryRule(description, rules)?.category_id ?? null;
}
