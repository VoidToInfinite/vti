import { describe, it, expect } from "vitest";
import { AURA_SURFACE } from "@/components/scenes/aura/aura.layers";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import {
  contrastRatio,
  contrastRatioOverAlpha,
  relativeLuminance,
} from "@/theme/tokens/contrast";
import { themes } from "@/theme/themes";
import { languageAccent, languageInactiveInk } from "./LanguageSelector";

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

/*
 * CRÍTICA EXTERNA #20 (2026-09-07, P1): LA BARRA ES FIJA Y EL ARTE PASA POR
 * DEBAJO.
 *
 * Los cuatro casos de arriba miden esta pieza donde CARGA: sobre el hero, y
 * sobre los tres fondos que el cristal de la barra puede componer. Con la
 * página desplazada, lo que hay detrás del texto no es ninguno de ellos: es el
 * arte de la sección que esté pasando por debajo en ese instante, y eso no es
 * un token -- son once capas de WebP con paralaje, así que no se puede
 * calcular desde el repo. Se MIDE en navegador y lo que entra aquí es la
 * luminancia del fondo del 5 % peor, que es lo que decide el p05.
 *
 * MEDIDO CON SONDA PROPIA sobre el build servido de `ecf55bc` (Chrome real sin
 * ventana, 1440x900, `deviceScaleFactor: 1`, tema fijado antes de cargar, SIN
 * `prefers-reduced-motion` -- con la preferencia activa el arte no se desplaza
 * y la banda no existe), método del censo (`scripts/check-text-contrast.mjs`):
 * fondo capturado con la tinta apagada, caja de línea erosionada 2 px, p05 de
 * la distribución. 240 mediciones en oscuro y 174 en claro; las cifras
 * completas y las bandas están en el docblock de `languageAccent`.
 *
 * POR QUÉ UNA SOLA SUPERFICIE POR TEMA Y NO UNA POR ENLACE: el arte se
 * desplaza, así que el parche que hoy pasa bajo un enlace pasa mañana bajo el
 * otro. Se toma el peor fondo medido bajo CUALQUIERA de las dos cajas y se
 * exige que las dos tintas lo pasen. Es también lo que impide un verde cómodo:
 * en claro «English» nunca llegó a incumplir en el barrido, y aun así su tinta
 * sube porque el fondo malo existe a diez píxeles de distancia.
 *
 * SI EL ARTE O EL FONDO DE LA BARRA CAMBIAN, ESTAS DOS CIFRAS CADUCAN. No se
 * ajustan a ojo para que un color nuevo pase: se vuelve a medir con el método
 * de arriba. Las mismas dos superficies alimentan las filas `header/*` del
 * censo, que es donde el gate las vigila.
 *
 * VALIDADO CON BUG INYECTADO: devolviendo las CUATRO tintas a su valor
 * anterior a esta entrega (`semantic.brandText`/`semantic.brand` en
 * `languageAccent` y `palette.neutral[800]`/`semantic.textSubtle` en
 * `languageInactiveInk`), los cuatro tests de arriba se ponen en rojo con las
 * cifras exactas que midió la sonda en navegador:
 *
 *   oklch(0.78 0.142 235.851) sobre el arte medido (L = 0.10446) da 3.444:1,
 *   por debajo de AA (4.5:1)...
 *   oklch(0.5 0.114 235.851) sobre el arte medido (L = 0.5811) da 3.509:1...
 *   oklch(0.78 0.006 286) sobre el arte medido (L = 0.10446) da 3.393:1...
 *   oklch(0.5 0 286) sobre el arte medido (L = 0.5811) da 3.606:1...
 *
 * Que esas cuatro cifras calculadas coincidan con las cuatro medidas en Chrome
 * (3,436/3,400 en oscuro y 3,509/3,606 en claro) es la comprobación de que la
 * superficie transcrita aquí es la que de verdad hay debajo. Restaurados los
 * cuatro escalones, «Tests 11 passed».
 */
describe("crítica #20 -- los dos enlaces sobre el arte que pasa bajo la barra fija", () => {
  const AA_TEXTO_NORMAL = 4.5;

  /** Ratio WCAG de un color del tema contra una LUMINANCIA medida en
   *  navegador. La mitad del par no es un token y no puede serlo, así que no
   *  hay `contrastRatio` que valga: la fórmula es la misma, con la luminancia
   *  ya resuelta en un lado. */
  function ratioContraLuminancia(color: string, luminancia: number): number {
    const tinta = relativeLuminance(color);
    return (
      (Math.max(tinta, luminancia) + 0.05) /
      (Math.min(tinta, luminancia) + 0.05)
    );
  }

  const ARTE_BAJO_LA_BARRA = [
    {
      nombre: "oscuro",
      theme: themes.dark,
      superficieL: 0.10446,
      y: 9450,
      viejoActivo: themes.dark.semantic.brand,
      viejoInactivo: themes.dark.semantic.textSubtle,
    },
    {
      nombre: "claro",
      theme: themes.light,
      superficieL: 0.5811,
      y: 4925,
      viejoActivo: themes.light.semantic.brandText,
      viejoInactivo: themes.light.palette.neutral[800],
    },
  ] as const;

  it.each(ARTE_BAJO_LA_BARRA)(
    "tema $nombre: el idioma ACTIVO pasa AA sobre el peor fondo medido (y = $y)",
    ({ theme, superficieL }) => {
      const color = languageAccent({ data: theme });
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
    "tema $nombre: el idioma INACTIVO pasa AA sobre el mismo fondo",
    ({ theme, superficieL }) => {
      const color = languageInactiveInk({ data: theme });
      const ratio = ratioContraLuminancia(color, superficieL);
      expect(
        ratio,
        `${color} sobre el arte medido (L = ${superficieL}) da ${ratio.toFixed(3)}:1, ` +
          `por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
      ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
    },
  );

  /*
   * Sonda de no-vacuidad, y aquí vale por partida doble: demuestra que las dos
   * superficies medidas son de verdad hostiles --las CUATRO tintas anteriores
   * incumplen contra ellas-- y que por tanto los cuatro verdes de arriba
   * dicen algo. Sin esto, una superficie mal transcrita (un cero de más)
   * dejaría pasar cualquier color.
   */
  it.each(ARTE_BAJO_LA_BARRA)(
    "sonda de no-vacuidad, tema $nombre: las DOS tintas anteriores incumplían contra ese mismo fondo",
    ({ superficieL, viejoActivo, viejoInactivo }) => {
      expect(ratioContraLuminancia(viejoActivo, superficieL)).toBeLessThan(
        AA_TEXTO_NORMAL,
      );
      expect(ratioContraLuminancia(viejoInactivo, superficieL)).toBeLessThan(
        AA_TEXTO_NORMAL,
      );
    },
  );
});
