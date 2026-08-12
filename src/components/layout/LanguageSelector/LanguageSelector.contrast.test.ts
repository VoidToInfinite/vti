import { describe, it, expect } from "vitest";
import { AURA_SURFACE } from "@/components/scenes/aura/aura.layers";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio, contrastRatioOverAlpha } from "@/theme/tokens/contrast";
import { themes } from "@/theme/themes";
import { languageAccent } from "./LanguageSelector";

/**
 * `glass.bg` (`src/theme/tokens/glass.ts`) se declara `oklch(L C H / A)` --
 * un solo literal con alfa, formato que `parseOklch`/`contrastRatioOverAlpha`
 * (`contrast.ts`) no aceptan tal cual (esperan el color base y el alfa por
 * separado). Se parsea aquí en vez de duplicar los literales de `glass.ts` a
 * mano: si esos valores cambian, este test sigue midiendo el fondo REAL sin
 * que nadie tenga que recordar actualizar una copia.
 */
function parseGlassBg(bg: string): { base: string; alpha: number } {
  const match = bg.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+) \/ ([^)]+)\)$/);
  if (!match) throw new Error(`glass.bg con formato inesperado: ${bg}`);
  const [, l, c, h, a] = match;
  return { base: `oklch(${l} ${c} ${h})`, alpha: Number(a) };
}

/*
 * Task 33 (gate F4, hallazgo del evaluador independiente 2026-08-12): el
 * idioma activo del navbar (`LanguageSelector.tsx`, `ScLanguageButton`
 * `$active`) medía 1,89:1 en tema claro -- muy por debajo de AA (4.5:1;
 * 14px bold no llega al umbral de "texto grande", que exige >=18.66px) -- y
 * era la ÚNICA señal visible de qué idioma está activo.
 *
 * CUATRO casos, no uno: 2 temas x 2 estados de la barra (`useNavDetach`,
 * `Navbar.tsx`) -- transparente sobre el hero y con cristal
 * (`ScSurface`/`glass.bg`) tras cruzar el umbral de scroll -- porque pueden
 * dar ratios distintos (el brief pide medir los dos, no asumir). El fondo
 * REAL de cada estado (regla del repo: nunca `surface` genérico):
 *
 *   - Transparente: el hero pinta DEBAJO de la barra -- `AURA_SURFACE`
 *     (claro, el pastel medido del arte) / `EYE_SURFACE` (oscuro, negro del
 *     lienzo) -- mismo precedente que `Hero.qa.test.tsx`/
 *     `BrandName.contrast.test.ts` ya usan para medir contra el hero real.
 *   - Con cristal: `glass.bg` es semitransparente (68% alfa) y compone sobre
 *     lo que haya detrás mientras la página scrollea -- no hay UN fondo
 *     fijo. Se miden los 3 fondos reales que puede componer (`semantic.bg`,
 *     `semantic.surface`, el void del hero -- por si el umbral de detach ya
 *     se cruzó pero el hero sigue siendo lo visible detrás) y se exige AA
 *     contra el PEOR, no contra uno solo.
 *
 * Cifras completas y causa raíz: docblock de `languageAccent`
 * (`LanguageSelector.tsx`).
 */
describe("Task 33 -- idioma activo, contraste AA en los 4 casos (2 temas x 2 estados de la barra)", () => {
  const AA_TEXTO_NORMAL = 4.5;

  const casos = [
    { nombre: "claro", theme: themes.light, voidHero: AURA_SURFACE },
    { nombre: "oscuro", theme: themes.dark, voidHero: EYE_SURFACE },
  ] as const;

  it.each(casos)(
    "tema $nombre, barra TRANSPARENTE (sobre el hero real)",
    ({ theme, voidHero }) => {
      const color = languageAccent({ data: theme });
      const ratio = contrastRatio(color, voidHero);
      expect(
        ratio,
        `${color} sobre ${voidHero} da ${ratio.toFixed(3)}:1, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  it.each(casos)(
    "tema $nombre, barra CON CRISTAL (peor de los fondos reales que puede componer detrás)",
    ({ theme, voidHero }) => {
      const color = languageAccent({ data: theme });
      const { base, alpha } = parseGlassBg(theme.glass.bg);
      const fondosReales = [
        theme.semantic.bg,
        theme.semantic.surface,
        voidHero,
      ];

      const ratios = fondosReales.map((fondo) =>
        contrastRatioOverAlpha(color, base, alpha, fondo),
      );
      const peor = Math.min(...ratios);

      expect(
        peor,
        `peor ratio ${peor.toFixed(3)}:1 de [${ratios.map((r) => r.toFixed(3)).join(", ")}], por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  /*
   * Sonda de no-vacuidad (mismo patrón que `legalPage.contrast.test.ts`):
   * sin esto, los 4 casos de arriba pasarían igual de verdes si
   * `languageAccent` devolviera siempre `semantic.brandText` por error de
   * copia/pega -- demuestra que el color VIEJO (`semantic.brand`) de verdad
   * incumplía AA en tema claro, así que el arreglo mide algo real, no un
   * cálculo que siempre da un número alto.
   */
  it("sonda de no-vacuidad: el color VIEJO (semantic.brand) seguía incumpliendo AA en claro contra el hero real", () => {
    const viejo = themes.light.semantic.brand;
    const ratio = contrastRatio(viejo, AURA_SURFACE);
    expect(ratio).toBeLessThan(AA_TEXTO_NORMAL);
  });
});
