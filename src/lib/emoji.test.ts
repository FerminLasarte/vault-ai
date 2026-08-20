import { describe, expect, it } from "vitest";
import { countGraphemes, isSingleEmoji } from "@/lib/emoji";

describe("countGraphemes", () => {
  it("counts a multi-code-point emoji as one grapheme", () => {
    expect(countGraphemes("👨‍👩‍👧")).toBe(1);
    expect(countGraphemes("🏋️")).toBe(1);
  });

  it("counts plain characters individually", () => {
    expect(countGraphemes("abc")).toBe(3);
  });
});

describe("isSingleEmoji", () => {
  it("accepts a single emoji", () => {
    expect(isSingleEmoji("💰")).toBe(true);
    expect(isSingleEmoji("🍽️")).toBe(true);
  });

  it("accepts emoji with skin tone and ZWJ sequences", () => {
    expect(isSingleEmoji("👍🏽")).toBe(true);
    expect(isSingleEmoji("👨‍👩‍👧")).toBe(true);
  });

  it("ignores surrounding whitespace", () => {
    expect(isSingleEmoji("  🚗 ")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isSingleEmoji("")).toBe(false);
    expect(isSingleEmoji("   ")).toBe(false);
  });

  it("rejects more than one emoji", () => {
    expect(isSingleEmoji("💰💼")).toBe(false);
  });

  it("rejects plain text", () => {
    expect(isSingleEmoji("a")).toBe(false);
    expect(isSingleEmoji("hola")).toBe(false);
    expect(isSingleEmoji("1")).toBe(false);
  });
});
