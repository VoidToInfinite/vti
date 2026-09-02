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
        /*
         * AA (C1): sube de warning[700] a warning[800] — ver semantic.ts.
         *
         * Contrato ACTUALIZADO, no relajado (regla 40): el rol `success` que
         * figuraba aquí se retiró en la crítica externa #10 (2026-08-18) por
         * consumidor único e inalcanzable (la rama `intent === "success"` de
         * `Button.tsx`, que ningún call site podía activar). Desaparece de
         * los dos objetos esperados en el mismo cambio en vez de dejar el
         * `toEqual` con una clave de más: como `toEqual` es exacto, si
         * `success` volviera a `semantic.ts` sin volver aquí, estos dos tests
         * caerían en rojo — que es exactamente la propiedad que se quiere
         * conservar.
         */
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
        /*
         * Crítica externa #14 (2026-09-02): sube de `neutral[1000]` (croma 0)
         * a `secondary[1000]` — el escalón inmediatamente superior de la misma
         * rampa de la que sale `bg`. Ver el docblock de `semantic.ts` para el
         * defecto medido (panel gris sobre fondo morado en la hoja móvil
         * oscura), por qué no se inventa un croma intermedio, y la tabla de
         * los siete pares recalculados. `surfaceSunken` NO cambia, y ahí la
         * medición manda en sentido contrario: comparte L con `bg`, así que su
         * croma cero ES lo único que la separa del fondo.
         */
        surface: color.secondary[1000],
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
        warning: color.warning[500],
        error: color.error[500],
      };
      expect(semanticDark).toEqual(expected);
    });

    /*
     * Candado de la corrección de asimetría de croma (crítica externa #14,
     * 2026-09-02). El `toEqual` de arriba ata el VALOR; esto ata la
     * PROPIEDAD que motivó el cambio, que es lo que tiene que seguir siendo
     * cierto aunque mañana `bg` se mueva a otro escalón por decisión del
     * dueño: la superficie elevada del tema oscuro pertenece a la misma
     * familia de color que el fondo sobre el que flota.
     */
    it("surface comparte hue y croma real con bg en vez de ser acromática (el defecto medido en la hoja móvil oscura)", () => {
      const hue = (c: string): number =>
        Number(c.split(" ")[2].replace(")", ""));
      const croma = (c: string): number => Number(c.split(" ")[1]);

      expect(hue(semanticDark.surface)).toBe(hue(semanticDark.bg));
      expect(croma(semanticDark.surface)).toBeGreaterThan(0);

      // Sonda de no-vacuidad: el valor VIEJO (neutral[1000]) fallaba las dos
      // aserciones de arriba, así que el test mide algo real y no una
      // tautología sobre cualquier par de tokens.
      expect(hue(color.neutral[1000])).not.toBe(hue(semanticDark.bg));
      expect(croma(color.neutral[1000])).toBe(0);
    });

    it("el cambio de surface no baja ningún par de contraste: los siete suben", () => {
      const antes = color.neutral[1000];
      const roles = [
        "text",
        "textMuted",
        "textSubtle",
        "focus",
        "brandSolid",
        "warning",
        "error",
      ] as const;

      for (const rol of roles) {
        const ahora = contrastRatio(semanticDark[rol], semanticDark.surface);
        expect(
          ahora,
          `${rol} sobre surface da ${ahora.toFixed(3)}:1`,
        ).toBeGreaterThan(contrastRatio(semanticDark[rol], antes));
      }
    });

    /*
     * La otra mitad de la decisión, afirmada en positivo para que nadie la
     * "arregle" por simetría: `surfaceSunken` comparte L con `bg`, así que su
     * croma cero es lo ÚNICO que la separa del fondo de página. Teñirla la
     * haría desaparecer.
     */
    it("surfaceSunken se queda acromática a propósito: comparte luminosidad con bg y el croma es su única señal", () => {
      const luminosidad = (c: string): number =>
        Number(c.slice("oklch(".length).split(" ")[0]);
      const croma = (c: string): number => Number(c.split(" ")[1]);

      expect(luminosidad(semanticDark.surfaceSunken)).toBe(
        luminosidad(semanticDark.bg),
      );
      expect(croma(semanticDark.surfaceSunken)).toBeLessThan(
        croma(semanticDark.bg) / 10,
      );
      // Separación de luminancia real contra el fondo: prácticamente nula.
      expect(
        contrastRatio(semanticDark.surfaceSunken, semanticDark.bg),
      ).toBeLessThan(1.05);
    });
  });
});
