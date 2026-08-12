import { describe, it, expect } from "vitest";
import { contrastRatio, contrastRatioOverAlpha } from "@/theme/tokens/contrast";
import { themes } from "@/theme/themes";
import { navActiveAccent } from "./NavSheet";

/**
 * `glass.bg` (`src/theme/tokens/glass.ts`) se declara `oklch(L C H / A)` --
 * un solo literal con alfa, formato que `parseOklch`/`contrastRatioOverAlpha`
 * (`contrast.ts`) no aceptan tal cual. Se parsea aquí en vez de duplicar los
 * literales de `glass.ts` a mano -- mismo helper que
 * `LanguageSelector.contrast.test.ts` (Task 33).
 */
function parseGlassBg(bg: string): { base: string; alpha: number } {
  const match = bg.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+) \/ ([^)]+)\)$/);
  if (!match) throw new Error(`glass.bg con formato inesperado: ${bg}`);
  const [, l, c, h, a] = match;
  return { base: `oklch(${l} ${c} ${h})`, alpha: Number(a) };
}

/*
 * Fix wave A, hallazgo A4 (WCAG 1.4.11 Non-text Contrast, revisión final de
 * rama). El punto indicador de sección activa (`ScNavPanelLink::before` en
 * `Navbar.tsx`, `ScSheetRow::before` en `NavSheet.tsx`) pintaba con
 * `semantic.brand` en las DOS ramas -- introducido por la Tarea 1
 * (navegación accesible), ANTERIOR al barrido de contraste de la Task 33,
 * que arregló el mismo defecto para el idioma activo pero no llegó a este
 * indicador (no existía ningún candado de contraste sobre él todavía).
 *
 * DOS superficies, no una -- las DOS reales sobre las que pinta el punto,
 * nunca `surface` genérico:
 *   - La HOJA móvil (`ScNavSheet`, `NavSheet.tsx`): superficie OPACA
 *     (`semantic.surface`), sin cristal -- se mide con `contrastRatio`
 *     directo.
 *   - El PANEL de escritorio (`ScNavPanel`, `Navbar.tsx`): `glass.bg`
 *     (68% alfa) compuesto sobre `semantic.bg` -- se mide con
 *     `contrastRatioOverAlpha`, mismo mecanismo que
 *     `LanguageSelector.contrast.test.ts` (Task 33).
 *
 * Es un indicador de ESTADO no textual (WCAG 1.4.11), así que el umbral es
 * 3:1, no el 4.5:1 de texto normal -- aunque el arreglo (`brandText` en
 * claro) pasa también el más exigente de los dos con margen.
 */
describe("navActiveAccent -- contraste AA no-textual del punto de sección activa (2 temas x 2 superficies)", () => {
  const AA_NO_TEXTO = 3;

  const casos = [
    { nombre: "claro", theme: themes.light },
    { nombre: "oscuro", theme: themes.dark },
  ] as const;

  it.each(casos)(
    "tema $nombre, HOJA móvil (semantic.surface, superficie opaca)",
    ({ theme }) => {
      const color = navActiveAccent({ data: theme });
      const ratio = contrastRatio(color, theme.semantic.surface);
      expect(
        ratio,
        `${color} sobre ${theme.semantic.surface} da ${ratio.toFixed(3)}:1, por debajo de ${AA_NO_TEXTO}:1`,
      ).toBeGreaterThanOrEqual(AA_NO_TEXTO);
    },
  );

  it.each(casos)(
    "tema $nombre, PANEL de escritorio (glass.bg 68% compuesto sobre semantic.bg)",
    ({ theme }) => {
      const color = navActiveAccent({ data: theme });
      const { base, alpha } = parseGlassBg(theme.glass.bg);
      const ratio = contrastRatioOverAlpha(
        color,
        base,
        alpha,
        theme.semantic.bg,
      );
      expect(
        ratio,
        `${color} sobre glass.bg/${theme.semantic.bg} da ${ratio.toFixed(3)}:1, por debajo de ${AA_NO_TEXTO}:1`,
      ).toBeGreaterThanOrEqual(AA_NO_TEXTO);
    },
  );

  /*
   * Sonda de no-vacuidad (mismo patrón que `LanguageSelector.contrast.test.ts`,
   * Task 33): sin esto, los 4 casos de arriba pasarían igual de verdes si
   * `navActiveAccent` devolviera siempre `semantic.brandText` por error de
   * copia/pega -- demuestra que el color VIEJO (`semantic.brand`) de verdad
   * incumplía el umbral no-textual en tema claro, así que el arreglo mide
   * algo real.
   */
  it("sonda de no-vacuidad: el color VIEJO (semantic.brand) seguía incumpliendo 3:1 en claro, en las DOS superficies", () => {
    const viejo = themes.light.semantic.brand;

    const ratioHoja = contrastRatio(viejo, themes.light.semantic.surface);
    expect(ratioHoja).toBeLessThan(AA_NO_TEXTO);

    const { base, alpha } = parseGlassBg(themes.light.glass.bg);
    const ratioPanel = contrastRatioOverAlpha(
      viejo,
      base,
      alpha,
      themes.light.semantic.bg,
    );
    expect(ratioPanel).toBeLessThan(AA_NO_TEXTO);
  });
});
