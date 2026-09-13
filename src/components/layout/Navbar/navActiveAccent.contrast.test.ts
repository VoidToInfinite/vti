import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  contrastRatioOverAlpha,
  relativeLuminance,
} from "@/theme/tokens/contrast";
import { themes } from "@/theme/themes";
import { navLinkHoverInk, navLinkInk } from "./Navbar";
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

/*
 * CRÍTICA EXTERNA #20 (2026-09-07, P1): LA BARRA ES FIJA Y EL ARTE PASA POR
 * DEBAJO -- AHORA LOS ENLACES DE SECCIÓN, NO SOLO EL PUNTO.
 *
 * Todo lo de arriba mide el INDICADOR de sección activa contra las superficies
 * que el repo puede calcular: la hoja opaca y el cristal del panel compuesto
 * sobre `semantic.bg`. Lo que ninguna ronda había medido es la TINTA DEL TEXTO
 * de los enlaces con la página desplazada: entonces lo que hay detrás no es
 * ninguna de esas dos superficies -- son once capas de WebP con paralaje, que
 * no se pueden calcular desde el repo. Se MIDE en navegador y lo que entra
 * aquí es la luminancia del fondo del 5 % peor, que es lo que decide el p05.
 *
 * MEDIDO CON SONDA PROPIA sobre el build servido de `b974fa2` (Chrome real sin
 * ventana, 1440x900, `deviceScaleFactor: 1`, tema fijado antes de cargar,
 * barrido completo de la página en pasos de 25 px, con y sin
 * `prefers-reduced-motion`), método del censo
 * (`scripts/check-text-contrast.mjs`): fondo capturado con la tinta apagada,
 * caja de línea erosionada 2 px, p05 de la distribución, y descarte físico de
 * lo que no se pinta. Las cifras completas, las seis piezas y las dos bandas
 * están en el docblock de `navLinkInk` (`Navbar.tsx`).
 *
 * POR QUÉ UNA SOLA SUPERFICIE POR TEMA Y NO UNA POR ENLACE: el arte se
 * desplaza, así que el parche que hoy pasa bajo «Características» pasa mañana
 * bajo «Contacto». Se toma el peor fondo medido bajo CUALQUIERA de las seis
 * cajas y se exige que las dos tintas lo pasen.
 *
 * POR QUÉ EL TEMA OSCURO TAMBIÉN SE ATA AUNQUE NO SE HAYA TOCADO: pasa hoy
 * (5,52 y 5,55 calculados, 5,535 medido) y lo que este candado impide es que
 * deje de pasar sin que nadie se entere -- si alguien aclara `textMuted` o
 * `brandText` en la rama oscura, o mueve el escalón de la rampa, este test se
 * pone en rojo antes de que el arte lo descubra.
 *
 * SI EL ARTE O EL FONDO DE LA BARRA CAMBIAN, ESTAS DOS CIFRAS CADUCAN. No se
 * ajustan a ojo para que un color nuevo pase: se vuelve a medir con el método
 * de arriba. Las mismas dos superficies alimentan las filas `navbar/*` del
 * censo, que es donde el gate las vigila.
 *
 * VALIDADO CON BUG INYECTADO: devolviendo las DOS tintas claras a su valor
 * anterior a esta entrega (`semantic.textMuted` en `navLinkInk` y
 * `semantic.brandText` en `navLinkHoverInk`), los dos tests del tema claro se
 * ponen en rojo con las cifras exactas que midió la sonda en navegador:
 *
 *   AssertionError: oklch(0.5 0 286) sobre el arte medido (L = 0.56904) da
 *   3.537:1, por debajo de AA (4.5:1). No bajes el umbral ni retoques la
 *   superficie: vuelve a medir en navegador con el método del docblock.:
 *   expected 3.537371428571429 to be greater than or equal to 4.5
 *
 *   AssertionError: oklch(0.5 0.114 235.851) sobre el arte medido
 *   (L = 0.56904) da 3.441:1, por debajo de AA (4.5:1): expected
 *   3.441461964986076 to be greater than or equal to 4.5
 *
 * Los DOS del tema oscuro siguieron en verde durante esa inyección, que es lo
 * que había que ver: la rama que no se tocó no depende del arreglo.
 *
 * Que ese 3.537 calculado coincida con el 3,542 que la sonda midió en Chrome
 * bajo «Características» es la comprobación de que la superficie transcrita
 * aquí es la que de verdad hay debajo. Restaurados los dos escalones, «Tests
 * 11 passed».
 */
describe("crítica #20 -- los enlaces de la barra sobre el arte que pasa por debajo", () => {
  const AA_TEXTO_NORMAL = 4.5;

  /** Ratio WCAG de un color del tema contra una LUMINANCIA medida en
   *  navegador. La mitad del par no es un token y no puede serlo, así que no
   *  hay `contrastRatio` que valga: la fórmula es la misma, con la luminancia
   *  ya resuelta en un lado. Copia literal del helper de
   *  `LanguageSelector.contrast.test.ts`, que mide la pieza de al lado con el
   *  mismo método. */
  function ratioContraLuminancia(color: string, luminancia: number): number {
    const tinta = relativeLuminance(color);
    return (
      (Math.max(tinta, luminancia) + 0.05) /
      (Math.min(tinta, luminancia) + 0.05)
    );
  }

  const ARTE_BAJO_LA_BARRA = [
    {
      nombre: "claro",
      theme: themes.light,
      superficieL: 0.56904,
      y: 5150,
      viejoReposo: themes.light.semantic.textMuted,
      viejoHover: themes.light.semantic.brandText,
      incumplian: true,
    },
    {
      nombre: "oscuro",
      theme: themes.dark,
      superficieL: 0.07414,
      y: 9675,
      viejoReposo: themes.dark.semantic.textMuted,
      viejoHover: themes.dark.semantic.brandText,
      incumplian: false,
    },
  ] as const;

  it.each(ARTE_BAJO_LA_BARRA)(
    "tema $nombre: la tinta en REPOSO pasa AA sobre el peor fondo medido (y = $y)",
    ({ theme, superficieL }) => {
      const color = navLinkInk({ data: theme });
      const ratio = ratioContraLuminancia(color, superficieL);
      expect(
        ratio,
        `${color} sobre el arte medido (L = ${superficieL}) da ${ratio.toFixed(3)}:1, ` +
          `por debajo de AA (${AA_TEXTO_NORMAL}:1). No bajes el umbral ni retoques la ` +
          `superficie: vuelve a medir en navegador con el método del docblock.`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  it.each(ARTE_BAJO_LA_BARRA)(
    "tema $nombre: la tinta de HOVER y FOCO pasa AA sobre el mismo fondo",
    ({ theme, superficieL }) => {
      const color = navLinkHoverInk({ data: theme });
      const ratio = ratioContraLuminancia(color, superficieL);
      expect(
        ratio,
        `${color} sobre el arte medido (L = ${superficieL}) da ${ratio.toFixed(3)}:1, ` +
          `por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  /*
   * Sonda de no-vacuidad, y aquí dice DOS cosas distintas según el tema.
   *
   * En CLARO demuestra que la superficie medida es de verdad hostil -- las dos
   * tintas anteriores incumplen contra ella -- y que por tanto los dos verdes
   * de arriba dicen algo: sin esto, una superficie mal transcrita (un cero de
   * más) dejaría pasar cualquier color.
   *
   * En OSCURO dice justo lo contrario, y también hay que atarlo: las tintas
   * NO cambiaron porque ya pasaban, así que la sonda exige que sigan pasando
   * -- si algún día un test de arriba se pusiera verde en oscuro solo porque
   * alguien copió la superficie clara aquí, esta aserción caería.
   */
  it.each(ARTE_BAJO_LA_BARRA)(
    "sonda de no-vacuidad, tema $nombre: las tintas anteriores incumplían (claro) o ya cumplían (oscuro) contra ese mismo fondo",
    ({ superficieL, viejoReposo, viejoHover, incumplian }) => {
      const reposo = ratioContraLuminancia(viejoReposo, superficieL);
      const hover = ratioContraLuminancia(viejoHover, superficieL);
      if (incumplian) {
        expect(reposo).toBeLessThan(AA_TEXTO_NORMAL);
        expect(hover).toBeLessThan(AA_TEXTO_NORMAL);
      } else {
        expect(reposo).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
        expect(hover).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
      }
    },
  );
});
