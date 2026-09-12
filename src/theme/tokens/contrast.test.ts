import { describe, it, expect } from "vitest";
import { semanticLight, semanticDark } from "./semantic";
import {
  contrastRatio,
  contrastRatioHex,
  relativeLuminanceHex,
} from "./contrast";

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

    /*
     * Dos roles de estado, no tres: `success` se retiró en la crítica externa
     * #10 (2026-08-18) por consumidor único e inalcanzable — ver el docblock
     * de `SemanticColors` en `semantic.ts`. La lista se actualiza en el mismo
     * cambio en vez de dejar un `semantic["success"]` que resolvería a
     * `undefined` y haría fallar `contrastRatio` por una razón ajena al
     * contraste.
     */
    it.each(["warning", "error"] as const)("%s sobre bg ≥ 4.5:1", (role) => {
      const ratio = contrastRatio(semantic[role], semantic.bg);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });
});

/**
 * `contrastRatioHex`/`relativeLuminanceHex` (Task 12, dieta de ornamento B,
 * 2026-08-09): extension de este modulo para medir un token oklch() contra
 * un literal hex sRGB -- el void de las escenas decorativas oscuras
 * (`*_VOID` en `src/components/scenes/*​/*.layers.ts`) se declara VERBATIM en
 * hex, nunca convertido a oklch() (ver el docblock de cada `*_VOID`), asi que
 * `contrastRatio` por si sola no puede medir contra el -- solo acepta dos
 * oklch(). Story.test.tsx/Contact.test.tsx/Journey.test.tsx/Features.test.tsx
 * la reutilizan para medir sus acentos oscuros recien convertidos a color
 * solido contra el void de su propia escena.
 */
describe("contrastRatioHex/relativeLuminanceHex", () => {
  it("relativeLuminanceHex de blanco puro es 1, de negro puro es 0", () => {
    expect(relativeLuminanceHex("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminanceHex("#000000")).toBeCloseTo(0, 5);
  });

  it("contrastRatioHex(blanco oklch, negro hex) da el maximo WCAG, 21:1", () => {
    const ratio = contrastRatioHex("oklch(1 0 0)", "#000000");
    expect(ratio).toBeCloseTo(21, 1);
  });

  /*
   * Contraste de herramientas (CLAUDE.md §2.1): el mismo par de colores
   * medido por las dos vias -- contrastRatio (oklch vs oklch) y
   * contrastRatioHex (oklch vs hex) -- tiene que dar el MISMO numero cuando
   * el hex y el oklch describen el mismo color real (negro puro, blanco
   * puro: los unicos dos donde la conversion manual no arrastra redondeo).
   * Si algun dia las dos formulas divergen (un cambio en una sin el mismo
   * cambio en la otra), este test lo detecta.
   */
  it("da el MISMO resultado que contrastRatio cuando el hex y el oklch son el mismo color real", () => {
    const viaOklch = contrastRatio("oklch(0.5 0.114 235.851)", "oklch(0 0 0)");
    const viaHex = contrastRatioHex("oklch(0.5 0.114 235.851)", "#000000");
    expect(viaHex).toBeCloseTo(viaOklch, 5);
  });

  /*
   * Bug inyectado a proposito (regla 34): sustituyendo el `0.2126`/`0.7152`/
   * `0.0722` de `relativeLuminanceHex` por los pesos de una media simple
   * (`1/3` cada canal) este test se puso en rojo (deja de coincidir con
   * `relativeLuminance`, que SI usa los pesos WCAG reales, sobre el mismo
   * color); restaurado, vuelve a verde -- ver el informe de la tarea para la
   * salida literal de las dos corridas.
   */
  it("pondera los canales con los coeficientes WCAG reales (0.2126/0.7152/0.0722), no una media simple", () => {
    // Un gris puro (r=g=b) hace que CUALQUIER ponderacion que sume 1 de el
    // mismo resultado -- por eso la sonda usa un color NO gris (mas verde
    // que rojo/azul): con pesos WCAG reales, el canal verde (0.7152) domina
    // mucho mas que con una media simple (1/3 cada uno).
    const luminanciaWcag = relativeLuminanceHex("#00ff00"); // verde puro
    const mediaSimple = (0 + 1 + 0) / 3;
    expect(luminanciaWcag).not.toBeCloseTo(mediaSimple, 2);
    expect(luminanciaWcag).toBeCloseTo(0.7152, 3);
  });
});
