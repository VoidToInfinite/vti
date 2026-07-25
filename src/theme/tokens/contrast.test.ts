import { describe, it, expect } from "vitest";
import { semanticLight, semanticDark } from "./semantic";
import { contrastRatio } from "./contrast";

/**
 * Validación real de contraste WCAG AA sobre los roles semánticos.
 *
 * `contrastRatio` (en `./contrast`) implementa la conversión
 * `oklch(L C H)` → OKLab → sRGB lineal (matriz estándar CSS Color 4 / Björn
 * Ottosson) y el cálculo de ratio de contraste WCAG, sin dependencias
 * externas. La luminancia relativa se computa directamente sobre los
 * canales lineales resultantes de la matriz OKLab→sRGB (ya son lineales, no
 * hace falta gamma-decode adicional).
 */

describe("contraste WCAG AA de los roles semánticos", () => {
  describe.each([
    ["light", semanticLight],
    ["dark", semanticDark],
  ] as const)("tema %s", (_name, semantic) => {
    it.each([
      ["text", "bg"],
      ["text", "surface"],
      ["text", "surfaceSunken"],
      ["textMuted", "bg"],
      ["textMuted", "surface"],
      ["textMuted", "surfaceSunken"],
      ["textSubtle", "bg"],
      ["textSubtle", "surface"],
      ["textSubtle", "surfaceSunken"],
    ] as const)("%s sobre %s ≥ 4.5:1", (fg, bg) => {
      const ratio = contrastRatio(semantic[fg], semantic[bg]);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("onBrand sobre brandSolid ≥ 4.5:1", () => {
      const ratio = contrastRatio(semantic.onBrand, semantic.brandSolid);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("focus sobre bg ≥ 3:1", () => {
      const ratio = contrastRatio(semantic.focus, semantic.bg);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it("focus sobre surface ≥ 3:1", () => {
      const ratio = contrastRatio(semantic.focus, semantic.surface);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it.each(["success", "warning", "error"] as const)(
      "%s sobre bg ≥ 4.5:1",
      (role) => {
        const ratio = contrastRatio(semantic[role], semantic.bg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      },
    );
  });
});
