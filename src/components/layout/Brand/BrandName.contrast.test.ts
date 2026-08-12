import { describe, it, expect } from "vitest";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import { basicLightTheme, basicDarkTheme, themes } from "@/theme/themes";
import { ctaGradientMidStop } from "./BrandName";

/**
 * Interpola dos colores `oklch(L C H)` linealmente en sus componentes
 * CARTESIANOS de OKLab (`L`, `a = C·cos(H)`, `b = C·sin(H)`), no en `L/C/H`
 * directamente -- interpolar croma/tono en polar produciría una trayectoria
 * distinta a la que de verdad pinta un `linear-gradient()` sin hint
 * `in <space>` (CSS Color 4: el espacio de interpolación por defecto es
 * OKLab, un espacio RECTANGULAR). Existe solo para el muestreo grueso de
 * abajo (describe "Task 33"): interpolar EN el espacio real del gradiente,
 * no adivinar un punto intermedio a ojo.
 */
function mixOklch(from: string, to: string, t: number): string {
  const parse = (s: string): { l: number; a: number; b: number } => {
    const m = s.match(/^oklch\(([^ ]+) ([^ ]+) ([^ ]+)\)$/);
    if (!m) throw new Error(`Formato oklch inválido: ${s}`);
    const l = Number(m[1]);
    const c = Number(m[2]);
    const hRad = (Number(m[3]) * Math.PI) / 180;
    return { l, a: c * Math.cos(hRad), b: c * Math.sin(hRad) };
  };
  const from_ = parse(from);
  const to_ = parse(to);
  const l = from_.l + (to_.l - from_.l) * t;
  const a = from_.a + (to_.a - from_.a) * t;
  const b = from_.b + (to_.b - from_.b) * t;
  const c = Math.sqrt(a * a + b * b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return `oklch(${l} ${c} ${h})`;
}

/**
 * `palette.secondary[300]` es el unico primitivo GENUINAMENTE nuevo del
 * degradado de `ScGradientTail` (BrandName.tsx) y de los CTA del Hero
 * (Hero.tsx): los otros dos stops (`semantic.text`, `semantic.brandText`) ya
 * estan probados con AA sobre `EYE_SURFACE` en `Hero.qa.test.tsx`. Mismo
 * patron: `contrastRatio` + `EYE_SURFACE`, sin renderizar componentes.
 *
 * `palette` es el mismo objeto `color` compartido entre los dos temas
 * (themes.ts: `palette: color` en el `shared` de ambos), asi que el numero
 * no deberia diferir entre tema claro y oscuro -- se mide en los dos de
 * todas formas, como red de regresion, no porque se espere un resultado
 * distinto.
 */
describe("contraste AA del tramo nuevo del degradado del titulo (BrandName)", () => {
  it.each([
    ["light", basicLightTheme],
    ["dark", basicDarkTheme],
  ] as const)(
    "palette.secondary[300] sobre EYE_SURFACE (tema %s) >= 4.5:1",
    (_name, theme) => {
      const ratio = contrastRatio(theme.palette.secondary[300], EYE_SURFACE);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    },
  );
});

/**
 * Task 33 (gate F4, hallazgo del evaluador independiente 2026-08-12):
 * `ctaGradient` (BrandName.tsx) es el fondo animado de los dos CTA con texto
 * legible ENCIMA -- ScCtaPrimary (Hero.tsx) y ScSubmitButton (Contact.tsx).
 * Antes de esta tarea compartían `heroGradient` con el título, cuya parada de
 * 65% (`palette.secondary[300]`, la más clara de las 3 distintas) media
 * 1.69:1 contra el texto blanco del botón en tema claro -- por debajo de AA
 * (4.5:1).
 *
 * DOS CANDADOS, no uno, y por qué hacen falta los dos (fix de revisión: el
 * primero, ya existente, midió bien pero se justificó mal -- ver el
 * docblock de `ctaGradientMidStop`/`ctaGradient` en `BrandName.tsx` para la
 * corrección completa):
 *
 * 1. LOS 3 STOPS DISTINTOS contra `semantic.onBrand`. Esto basta para
 *    conocer el peor caso real SOLO porque `onBrand` es un EXTREMO de la
 *    escala de luminancia (blanco puro en claro, casi negro en oscuro) --
 *    ningún par de paradas puede flanquearlo, así que el fondo nunca CRUZA
 *    el color del texto. No es una ley general de gradientes OKLab: `L`
 *    interpola linealmente entre dos paradas, pero la LUMINANCIA RELATIVA
 *    WCAG que decide el contraste es una función de R/G/B con coeficientes
 *    de signo mixto sobre l/m/s (`oklchToLinearSrgb`, `contrast.ts`), así
 *    que un camino monótono en `L` no garantiza un camino monótono en
 *    luminancia sRGB.
 * 2. MUESTREO GRUESO de cada segmento (25 puntos, interpolados en OKLab --
 *    `L`/`a`/`b` lineales, igual que el motor del navegador) contra
 *    `semantic.onBrand`. Este candado NO depende de que `onBrand` siga
 *    siendo un extremo: sigue siendo válido aunque esa condición estructural
 *    deje de cumplirse en el futuro (un rediseño que mueva `onBrand` a un
 *    tono intermedio, por ejemplo) -- es la red de seguridad barata que
 *    sustituye a la demostración analítica cuando esta deja de aplicar.
 *
 * `ctaGradientMidStop` se importa de `BrandName.tsx` (no se duplica el
 * ternario a mano aquí): los dos candados miden la MISMA función que
 * resuelve el color real en pantalla.
 */
describe("Task 33 -- peor fotograma del degradado animado del CTA (contraste AA)", () => {
  const AA_TEXTO_NORMAL = 4.5;

  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ] as const)(
    "las 3 paradas distintas de ctaGradient pasan AA contra semantic.onBrand (tema %s)",
    (_name, theme) => {
      const paradas: Record<string, string> = {
        "0%/100% (semantic.text)": theme.semantic.text,
        "35% (semantic.brandText)": theme.semantic.brandText,
        "65% (ctaGradientMidStop)": ctaGradientMidStop(theme),
      };

      for (const [etiqueta, color] of Object.entries(paradas)) {
        const ratio = contrastRatio(theme.semantic.onBrand, color);
        expect(
          ratio,
          `parada ${etiqueta} = ${color} da ${ratio.toFixed(3)}:1 contra onBrand, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
        ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
      }
    },
  );

  /*
   * Sonda de no-vacuidad: demuestra que la parada VIEJA (secondary[300], la
   * que usaba heroGradient antes del split) de verdad incumplía AA en tema
   * claro -- si esta aserción alguna vez empezara a pasar, sería la señal de
   * que `ctaGradientMidStop` dejó de resolver por rama y el candado de
   * arriba estaría midiendo un color que ya no es el real.
   */
  it("sonda de no-vacuidad: la parada VIEJA (secondary[300]) seguía incumpliendo AA en tema claro", () => {
    const ratio = contrastRatio(
      themes.light.semantic.onBrand,
      themes.light.palette.secondary[300],
    );
    expect(ratio).toBeLessThan(AA_TEXTO_NORMAL);
  });

  /*
   * Candado 2 (muestreo grueso): interpola en OKLab -- L/a/b lineales entre
   * dos paradas, la MISMA mecánica que un `linear-gradient()` sin hint
   * `in <space>` (CSS Color 4, "Interpolation") -- y mide `contrastRatio` en
   * cada punto. `mixOklch` vive AQUÍ, no en `contrast.ts`: es una utilidad
   * de VERIFICACIÓN (genera puntos intermedios para un test), no una pieza
   * que el código de producción necesite -- `ctaGradient` nunca calcula un
   * color intermedio a mano, delega esa interpolación en el navegador.
   */
  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ] as const)(
    "muestreo grueso (25 puntos/segmento) de los 3 segmentos del degradado nunca baja de AA (tema %s)",
    (_name, theme) => {
      const midStop = ctaGradientMidStop(theme);
      const segmentos: [string, string, string][] = [
        ["0%->35%", theme.semantic.text, theme.semantic.brandText],
        ["35%->65%", theme.semantic.brandText, midStop],
        ["65%->100%", midStop, theme.semantic.text],
      ];
      const PUNTOS_POR_SEGMENTO = 25;

      for (const [etiqueta, desde, hasta] of segmentos) {
        for (let i = 0; i <= PUNTOS_POR_SEGMENTO; i += 1) {
          const t = i / PUNTOS_POR_SEGMENTO;
          const punto = mixOklch(desde, hasta, t);
          const ratio = contrastRatio(theme.semantic.onBrand, punto);
          expect(
            ratio,
            `segmento ${etiqueta}, t=${t.toFixed(2)} (${punto}) da ${ratio.toFixed(3)}:1 contra onBrand, por debajo de AA (${AA_TEXTO_NORMAL}:1)`,
          ).toBeGreaterThanOrEqual(AA_TEXTO_NORMAL);
        }
      }
    },
  );
});
