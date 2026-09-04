import { describe, it, expect } from "vitest";
import { AURA_SURFACE } from "@/components/scenes/aura/aura.layers";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import { contrastRatio } from "@/theme/tokens/contrast";
import type { ThemeDefinition } from "@/theme/theme.types";
import { basicLightTheme, basicDarkTheme, themes } from "@/theme/themes";
import {
  ctaGradientMidStop,
  heroGradientMidStop,
  heroGradientStops,
  HERO_GRADIENT_SIZE_X_PERCENT,
  type GradientStop,
} from "./BrandName";

/**
 * Interpola dos colores `oklch(L C H)` linealmente en sus componentes
 * CARTESIANOS de OKLab (`L`, `a = C·cos(H)`, `b = C·sin(H)`), no en `L/C/H`
 * directamente -- interpolar croma/tono en polar produciría una trayectoria
 * distinta a la que de verdad pinta un `linear-gradient()` sin hint
 * `in <space>` (CSS Color 4: el espacio de interpolación por defecto es
 * OKLab, un espacio RECTANGULAR). La usan los DOS muestreos de este fichero
 * -- el de `ctaGradient` (describe "Task 33") y el del barrido de
 * `heroGradient` (describe "Crítica externa #18") --: interpolar EN el
 * espacio real del gradiente, no adivinar un punto intermedio a ojo.
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

/**
 * Color del degradado en una posición dada (0-100), interpolando en OKLab
 * entre las dos paradas que la flanquean. Las paradas llegan de
 * `heroGradientStops`, la MISMA función que serializa el `linear-gradient()`
 * real -- ni las posiciones ni los colores se escriben a mano aquí.
 */
function colorEnPosicion(stops: GradientStop[], posicion: number): string {
  const pos = Math.min(
    Math.max(posicion, stops[0].position),
    stops[stops.length - 1].position,
  );
  for (let i = 0; i < stops.length - 1; i += 1) {
    const desde = stops[i];
    const hasta = stops[i + 1];
    if (pos >= desde.position && pos <= hasta.position) {
      const tramo = hasta.position - desde.position;
      const t = tramo === 0 ? 0 : (pos - desde.position) / tramo;
      return mixOklch(desde.color, hasta.color, t);
    }
  }
  throw new Error(`Posición fuera del degradado: ${posicion}`);
}

/**
 * Fondos REALES contra los que se lee el título del hero en cada rama: el
 * token de página (`semantic.bg`) y la superficie de la composición que el
 * hero monta detrás del h1 en ese tema (`AURA_SURFACE` en claro,
 * `EYE_SURFACE` en oscuro). Los dos, no solo el token: medido en Chrome
 * sobre el build de producción, el peor caso del tema claro cae contra la
 * superficie del arte, no contra `semantic.bg` (4,909:1 frente a 5,591:1).
 */
function fondosReales(theme: ThemeDefinition): [string, string][] {
  return [
    ["semantic.bg", theme.semantic.bg],
    [
      theme.isLight ? "AURA_SURFACE" : "EYE_SURFACE",
      theme.isLight ? AURA_SURFACE : EYE_SURFACE,
    ],
  ];
}

/**
 * Crítica externa #18 (P1, 2026-09-04) -- EL OTRO MODO DEL DEGRADADO.
 *
 * Hasta esta ronda, este fichero solo medía el degradado en el modo "texto
 * ENCIMA del degradado": `ctaGradient` contra `semantic.onBrand`, umbral AA
 * de texto normal (describe "Task 33", arriba). Faltaba el modo que de
 * verdad falló: `gradientTextClip` recorta el degradado A TEXTO
 * (`background-clip: text`), así que ahí el degradado ES LA TINTA y lo que
 * hay que medir es su contraste contra el FONDO de la página, con el umbral
 * de TEXTO GRANDE (3:1) porque el h1 del hero es display.
 *
 * Nadie medía eso, y por el hueco se coló la parada de 65% de
 * `heroGradient` leyendo un peldaño CRUDO de paleta
 * (`palette.secondary[300]`), que resuelve IGUAL en las dos ramas porque
 * `palette` es compartida (`themes.ts`): correcto sobre el void casi negro
 * del tema oscuro, y 1,6:1 sobre el casi blanco del tema claro. Medido en
 * Chrome sobre el build de producción, tinta interior contra el fondo real y
 * borde antialiaseado descartado por erosión, tema claro: fase 0 mediana
 * 7,52 (0,0 % de la tinta bajo 3:1) · 2250 ms 5,30 (16,9 %) · 4500 ms 2,71
 * (55,3 %) · 6750 ms 2,23 (84,8 %) · 8999 ms 3,36 (42,6 %).
 *
 * TRES CANDADOS:
 *
 * 1. CADA PARADA de `heroGradientStops` contra los dos fondos reales de su
 *    rama. Es el candado que atrapa la causa raíz exacta: una parada que
 *    vuelva a leer un peldaño crudo de `palette`.
 * 2. LA COBERTURA del muestreo del candado 3, que NO es gratis. Con
 *    `background-size` al 260%, en cada instante solo se ve el 38,5% del
 *    degradado; lo que expone la parada de 65% no es una fase concreta sino
 *    el BARRIDO completo de `gradientShift` (`background-position` de 0% a
 *    100%). El candado 3 reconstruye ese barrido con una rejilla DISCRETA de
 *    fases, y una rejilla discreta puede dejar huecos: si la ventana visible
 *    se estrechara (un `HERO_GRADIENT_SIZE_X_PERCENT` mucho mayor) sin
 *    aumentar `FASES`, habría tramos del degradado que ninguna fase muestrea
 *    y el candado 3 quedaría ciego justo donde importa, en verde y sin
 *    avisar. Este candado afirma que, con la geometría REAL de hoy, cada
 *    parada cae dentro de al menos una ventana muestreada (verificado con
 *    bug inyectado: con `HERO_GRADIENT_SIZE_X_PERCENT` a 5000 cae en rojo
 *    porque la parada de 35% deja de entrar en ninguna ventana).
 * 3. EL BARRIDO muestreado fase a fase: reconstruye la ventana visible en
 *    cada fase de la animación y mide la interpolación dentro de ella. Es el
 *    que corresponde al defecto REAL, que no estaba en una parada sino en
 *    una FASE: el barrido es lo que lleva el rosa claro a cubrir media
 *    palabra.
 */
describe("Crítica externa #18 -- gradientTextClip: el degradado ES la tinta, se mide contra el FONDO", () => {
  const AA_TEXTO_GRANDE = 3;
  /** Fracción del degradado visible a la vez: 100% de caja sobre 260% de fondo. */
  const ANCHO_VENTANA = 100 / HERO_GRADIENT_SIZE_X_PERCENT;
  const FASES = 24;
  const PUNTOS_POR_FASE = 40;

  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ] as const)(
    "cada parada de heroGradient pasa texto grande (3:1) contra los dos fondos reales (tema %s)",
    (_name, theme) => {
      for (const stop of heroGradientStops(theme)) {
        for (const [etiquetaFondo, fondo] of fondosReales(theme)) {
          const ratio = contrastRatio(stop.color, fondo);
          expect(
            ratio,
            `parada ${stop.position}% = ${stop.color} da ${ratio.toFixed(3)}:1 contra ${etiquetaFondo}, por debajo de texto grande (${AA_TEXTO_GRANDE}:1)`,
          ).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE);
        }
      }
    },
  );

  it("la rejilla de fases del barrido cubre TODAS las paradas: ninguna cae en un hueco del muestreo", () => {
    const posiciones = heroGradientStops(themes.light).map((s) => s.position);
    for (const posicion of posiciones) {
      const alcanzada = Array.from({ length: FASES + 1 }, (_, i) => i / FASES)
        .map((p) => p * (100 - ANCHO_VENTANA * 100))
        .some(
          (inicio) =>
            posicion >= inicio - 1e-9 &&
            posicion <= inicio + ANCHO_VENTANA * 100 + 1e-9,
        );
      expect(
        alcanzada,
        `la parada ${posicion}% nunca entra en la ventana visible con background-size ${HERO_GRADIENT_SIZE_X_PERCENT}%: el muestreo por fases no la estaría midiendo`,
      ).toBe(true);
    }
  });

  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ] as const)(
    "el barrido completo de gradientShift nunca baja de 3:1 contra el fondo real (tema %s)",
    (_name, theme) => {
      const stops = heroGradientStops(theme);
      for (const [etiquetaFondo, fondo] of fondosReales(theme)) {
        for (let f = 0; f <= FASES; f += 1) {
          const inicio = (f / FASES) * (100 - ANCHO_VENTANA * 100);
          for (let i = 0; i <= PUNTOS_POR_FASE; i += 1) {
            const posicion =
              inicio + (i / PUNTOS_POR_FASE) * ANCHO_VENTANA * 100;
            const punto = colorEnPosicion(stops, posicion);
            const ratio = contrastRatio(punto, fondo);
            expect(
              ratio,
              `fase ${((f / FASES) * 100).toFixed(0)}% del barrido, posición ${posicion.toFixed(1)}% del degradado (${punto}) da ${ratio.toFixed(3)}:1 contra ${etiquetaFondo}, por debajo de texto grande (${AA_TEXTO_GRANDE}:1)`,
            ).toBeGreaterThanOrEqual(AA_TEXTO_GRANDE);
          }
        }
      }
    },
  );

  /*
   * Sonda de no-vacuidad, mismo criterio que la del describe "Task 33": el
   * peldaño CRUDO que la parada de 65% leía antes de esta corrección sigue
   * incumpliendo texto grande en tema claro, contra los dos fondos. Si esta
   * aserción empezara a pasar, los tres candados de arriba estarían midiendo
   * un umbral que ya no distingue nada.
   */
  it("sonda de no-vacuidad: el peldaño CRUDO (palette.secondary[300]) seguiría incumpliendo 3:1 en tema claro", () => {
    for (const [, fondo] of fondosReales(themes.light)) {
      expect(
        contrastRatio(themes.light.palette.secondary[300], fondo),
      ).toBeLessThan(AA_TEXTO_GRANDE);
    }
  });

  /*
   * El tema OSCURO no cambia con esta corrección, y hace falta decirlo con
   * un assert y no con un comentario: `ScDeckNoteAccent` (story.deck.tsx),
   * el otro consumidor de `gradientTextClip`, SOLO se monta en la rama
   * oscura (`StoryDeckDark`, Story.tsx -- verificado leyendo el JSX, no
   * supuesto), así que su aspecto depende de que esta rama siga resolviendo
   * el mismo peldaño de siempre.
   */
  it("la rama oscura de heroGradientMidStop sigue siendo el peldaño de siempre (ScDeckNoteAccent no se mueve)", () => {
    expect(heroGradientMidStop(themes.dark)).toBe(
      themes.dark.palette.secondary[300],
    );
    expect(heroGradientMidStop(themes.light)).not.toBe(
      themes.light.palette.secondary[300],
    );
  });
});
