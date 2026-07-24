import { describe, it, expect } from "vitest";
import { type as typo } from "./type";

describe("type tokens", () => {
  it("familias apuntan a variables CSS self-hosted", () => {
    expect(typo.fontBody).toBe("var(--font-body)");
    expect(typo.fontMono).toBe("var(--font-mono)");
  });
  it("expone la escala con tracking negativo en display", () => {
    expect(typo.scale.display.tracking).toBe("-0.02em");
    expect(typo.scale.body.weight).toBe(400);
  });
});
