// A single emoji can span several code points (skin-tone modifiers, ZWJ
// sequences like 👨‍👩‍👧), so "one character" has to be measured in grapheme
// clusters rather than in `String.length`.
export function countGraphemes(value: string): number {
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("es", { granularity: "grapheme" });
    return Array.from(segmenter.segment(value)).length;
  }
  return Array.from(value).length;
}

export function isSingleEmoji(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (countGraphemes(trimmed) !== 1) return false;
  return /\p{Extended_Pictographic}/u.test(trimmed);
}

export const DEFAULT_CATEGORY_EMOJI = "🏷️";

// Suggestions offered in the category form; the field still accepts any emoji.
export const EMOJI_SUGGESTIONS = [
  "💰",
  "💼",
  "🍽️",
  "🚗",
  "🍿",
  "🏠",
  "💊",
  "🎓",
  "✈️",
  "🛒",
  "☕",
  "🎁",
  "📱",
  "⚡",
  "🐶",
  "👕",
  "🏋️",
  "📦",
];
