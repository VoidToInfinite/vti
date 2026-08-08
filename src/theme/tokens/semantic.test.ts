import { describe, it, expect } from "vitest";
import { semanticLight, semanticDark, type SemanticColors } from "./semantic";
import { color } from "./color";
import { contrastRatio } from "./contrast";

describe("semantic colors", () => {
  it("ambos temas exponen el mismo set de roles", () => {
    expect(Object.keys(semanticLight).sort()).toEqual(
      Object.keys(semanticDark).sort(),
    );
  });

  // Antes este test solo comparaba el paso de la rampa (un número), sin medir
  // contraste real — no habría cazado una regresión que mantuviera el mismo
  // paso pero rompiera el ratio (p. ej. si `onBrand` cambiara de color). Mide
  // el contraste de verdad con el mismo helper que usa contrast.test.ts.
  it("dark: onBrand sobre brandSolid libra AA (≥4.5:1) usando step-500", () => {
    expect(semanticDark.brandSolid).toBe(color.primary[500]);
    expect(
      contrastRatio(semanticDark.onBrand, semanticDark.brandSolid),
    ).toBeGreaterThanOrEqual(4.5);
    expect(semanticLight.brandSolid).toBe(color.primary[800]);
  });

  describe("tema light", () => {
    it("mapea todos los roles correctamente al tema claro", () => {
      const white = "oklch(1 0 0)";
      const expected: SemanticColors = {
        /*
         * Fondo del body. El 2026-07-30 el usuario pidió explícitamente
         * `primary[50]` (blanco azulado) en vez de `neutral[50]`; el
         * 2026-08-06 pidió volver a `neutral[50]` — gris neutro, casi blanco
         * — al rediseñar Story y Features en tema claro sobre el mockup
         * `Landing v2.dc`, que pinta las dos secciones sobre un fondo neutro:
         * el tinte azulado competía con el `color-mix` de acento de las
         * tarjetas nuevas, que sí tiene que leerse como color.
         *
         * Se deja el histórico escrito en vez de sustituirlo porque el valor
         * ha ido y venido: sin la fecha de cada decisión, el siguiente que
         * lea esta línea no sabe si el valor actual es la petición vigente o
         * el residuo de una revertida a medias.
         */
        bg: color.neutral[50],
        surface: white,
        surfaceSunken: color.neutral[100],
        /*
         * Borde ambiental. El 2026-08-07 el usuario lo bajó de `neutral[300]`
         * a `neutral[100]` como parte de sus ajustes visuales del tema claro
         * (commit `74458b2`, "ajustes visuales del usuario ... y en el borde
         * del tema claro"), y ese mismo commit dejó por escrito que este
         * candado quedaba pendiente de actualizar o revertir en la sesión
         * siguiente. Se actualiza: el cambio es intencional y de rol, no un
         * descuido local.
         *
         * Contraste MEDIDO con el `contrastRatio` de este mismo directorio,
         * contra los tres fondos que el tema claro pinta bajo un borde:
         *
         * | fondo                      | `neutral[300]` (antes) | `neutral[100]` (ahora) |
         * |----------------------------|------------------------|------------------------|
         * | `surface` (blanco)         | 1.53:1                 | 1.12:1                 |
         * | `bg` (`neutral[50]`)       | —                      | 1.08:1                 |
         * | `surfaceSunken`            | —                      | 1.00:1                 |
         *
         * Sobre `surfaceSunken` el ratio es 1.00 porque ese rol ES
         * `neutral[100]`: ahí el borde queda literalmente del mismo color que
         * su fondo. El 3:1 de WCAG 1.4.11 aplica a los bordes que transmiten
         * información o estado; los de esta interfaz son separación ambiental
         * (las tarjetas ya se distinguen por su superficie blanca sobre el
         * `bg` gris), así que no hay incumplimiento — y el valor ANTERIOR
         * tampoco lo cumplía (1.53:1). Lo que sí hay es una pérdida real de
         * definición, que se reporta en la entrega. `borderStrong`
         * (`neutral[400]`, 2.00:1 sobre blanco) NO se tocó y sigue siendo el
         * borde con presencia cuando hace falta que se lea.
         */
        border: color.neutral[100],
        borderStrong: color.neutral[400],
        text: color.neutral[1000],
        textMuted: color.neutral[800],
        // AA (C1): sube de neutral[600] a neutral[700] — ver semantic.ts.
        textSubtle: color.neutral[700],
        brand: color.primary[500],
        // AA (C1): sube de primary[700] a primary[800] — ver semantic.ts.
        brandSolid: color.primary[800],
        brandText: color.primary[800],
        // AA (C1): sube de primary[500] a primary[700] — ver semantic.ts.
        focus: color.primary[700],
        onBrand: white,
        // AA (C1): sube de success[700]/warning[700] a success[800]/
        // warning[800] — ver semantic.ts.
        success: color.success[800],
        warning: color.warning[800],
        error: color.error[700],
      };
      expect(semanticLight).toEqual(expected);
    });
  });

  describe("tema dark", () => {
    it("mapea todos los roles correctamente al tema oscuro", () => {
      const expected: SemanticColors = {
        // Fondo del body pedido explicitamente por el usuario (2026-07-30):
        // secondary[1100] en vez de neutral[1100].
        bg: color.secondary[1100],
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
