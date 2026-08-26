import { describe, expect, it } from "vitest";
import { buildSuggestionMailto, suggestionBody } from "@/lib/feedback";

const CONTEXT = { version: "1.0.3", os: "macOS" };

describe("suggestionBody", () => {
  it("keeps what the person wrote at the top, untouched", () => {
    expect(suggestionBody("Me gustaría filtrar por etiqueta", CONTEXT)).toMatch(
      /^Me gustaría filtrar por etiqueta/,
    );
  });

  it("carries the version and the system, which nobody remembers to include", () => {
    expect(suggestionBody("hola", CONTEXT)).toContain("Vault 1.0.3 · macOS");
  });

  it("separates the message from the details", () => {
    expect(suggestionBody("hola", CONTEXT)).toBe("hola\n\n---\nVault 1.0.3 · macOS");
  });

  it("trims stray whitespace around the message", () => {
    expect(suggestionBody("  hola  \n\n", CONTEXT)).toMatch(/^hola\n/);
  });
});

describe("buildSuggestionMailto", () => {
  it("addresses the message and fills in the subject", () => {
    const url = buildSuggestionMailto("hola", CONTEXT);

    expect(url).toMatch(/^mailto:[^?]+\?/);
    expect(url).toContain("subject=Sugerencia%20para%20Vault");
  });

  it("encodes spaces as %20 rather than +, which mail clients show literally", () => {
    const url = buildSuggestionMailto("dos palabras", CONTEXT);

    expect(url).toContain("dos%20palabras");
    expect(url).not.toContain("+");
  });

  it("survives accents and newlines", () => {
    const url = buildSuggestionMailto("¿podés agregar categorías?\notra línea", CONTEXT);

    expect(url).not.toContain("\n");
    const body = decodeURIComponent(url.split("&body=")[1]);
    expect(body).toContain("¿podés agregar categorías?");
    expect(body).toContain("otra línea");
  });
});
