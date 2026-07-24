import { describe, it, expect } from "vitest";
import { semanticLight, semanticDark, type SemanticColors } from "./semantic";
import { color } from "./color";

describe("semantic colors", () => {
  it("ambos temas exponen el mismo set de roles", () => {
    expect(Object.keys(semanticLight).sort()).toEqual(
      Object.keys(semanticDark).sort(),
    );
  });
  it("dark usa step-500 para el sólido de marca (libra AA en oscuro)", () => {
    expect(semanticDark.brandSolid).toBe(color.primary[500]);
    expect(semanticLight.brandSolid).toBe(color.primary[700]);
  });

  describe("tema light", () => {
    it("mapea todos los roles correctamente al tema claro", () => {
      const white = "oklch(1 0 0)";
      const expected: SemanticColors = {
        bg: color.neutral[50],
        surface: white,
        surfaceSunken: color.neutral[100],
        border: color.neutral[300],
        borderStrong: color.neutral[400],
        text: color.neutral[1000],
        textMuted: color.neutral[800],
        textSubtle: color.neutral[600],
        brand: color.primary[500],
        brandSolid: color.primary[700],
        brandText: color.primary[800],
        focus: color.primary[500],
        onBrand: white,
        success: color.success[700],
        warning: color.warning[700],
        error: color.error[700],
      };
      expect(semanticLight).toEqual(expected);
    });
  });

  describe("tema dark", () => {
    it("mapea todos los roles correctamente al tema oscuro", () => {
      const expected: SemanticColors = {
        bg: color.neutral[1100],
        surface: color.neutral[1000],
        surfaceSunken: color.neutral[1100],
        border: color.neutral[800],
        borderStrong: color.neutral[700],
        text: color.neutral[50],
        textMuted: color.neutral[300],
        textSubtle: color.neutral[400],
        brand: color.primary[400],
        brandSolid: color.primary[500],
        brandText: color.primary[300],
        focus: color.primary[400],
        onBrand: color.neutral[1100],
        success: color.success[500],
        warning: color.warning[500],
        error: color.error[500],
      };
      expect(semanticDark).toEqual(expected);
    });
  });
});
