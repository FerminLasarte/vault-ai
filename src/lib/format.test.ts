import { describe, expect, it } from "vitest";
import { formatCompactAmount } from "@/lib/format";

// Intl separates the number from its unit with a non-breaking space, and that
// matters here: it is what stops a chart tick from wrapping mid-label.
const NBSP = "\u00a0";

describe("formatCompactAmount", () => {
  it("leaves small numbers alone", () => {
    expect(formatCompactAmount(0)).toBe("0");
    expect(formatCompactAmount(500)).toBe("500");
  });

  it("abbreviates thousands", () => {
    expect(formatCompactAmount(8000)).toBe(`8${NBSP}mil`);
    expect(formatCompactAmount(450000)).toBe(`450${NBSP}mil`);
  });

  it("abbreviates millions", () => {
    expect(formatCompactAmount(1200000)).toBe(`1,2${NBSP}M`);
  });

  it("keeps at most one decimal so a tick never grows unbounded", () => {
    expect(formatCompactAmount(12345)).toBe(`12,3${NBSP}mil`);
  });

  it("joins the number and unit with a non-breaking space", () => {
    expect(formatCompactAmount(8000)).toContain(NBSP);
    expect(formatCompactAmount(8000)).not.toContain(" ");
  });

  it("handles negatives", () => {
    expect(formatCompactAmount(-8000)).toBe(`-8${NBSP}mil`);
  });
});
