/**
 * Constantes del Footer. La rama OSCURA (spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`,
 * D9/D10/D17/D18) es arte VERBATIM del mockup y no se toca un píxel (D5 de
 * la spec `2026-08-07-footer-beam-estrellas-tema-claro-design.md`).
 *
 * Desde 2026-08-07 este fichero TAMBIÉN resuelve la tonalidad CLARA del
 * campo de estrellas (D3/D4 de esa spec): el punto y el halo de cada
 * estrella dejaron de ser cadenas de CSS ya compuestas en la tabla
 * (`tint`/`glow`) para pasar a ser DATOS (`tintKey`/`glowBlurPx`) que
 * `footerStarTint`/`footerStarGlow`, más abajo, componen en el render contra
 * el tema activo -- ver el docblock que las precede para el porqué.
 */
import type { ThemeDefinition } from "@/theme/theme.types";

/**
 * Casi-negro del footer oscuro, VERBATIM del mockup
 * (`Footer animado v2.dc.html`, Downloads 2026-08-03, L112:
 * `background:oklch(.055 .01 288)`).
 *
 * No es `semantic.surfaceSunken`: ese rol en oscuro resuelve a
 * `color.neutral[1100]` = `oklch(0.22 0.004 286)` (`color.ts` L13/28 -- paso
 * 1100 de la rampa neutra -- y `semantic.ts:65`). Sobre ese gris, la costura
 * con el vacío casi negro de la escena de Contacto
 * (`CONTACT_GUARDIAN_VOID = "#0d0416"`,
 * `contactCosmicGuardian.layers.ts`) se vería como un escalón claro, no como
 * una continuidad -- justo el defecto que D17 corrige. El razonamiento no
 * dependía del arte concreto y sobrevivió al cambio de escena del
 * 2026-08-04: el void pasó de `#02040e` (OKLCH L 0.111) a `#0d0416` (L
 * 0.137), los dos muy por debajo del 0.22 del rol semántico. Es un literal de UNA composición (la costura
 * Contacto→Footer), no un rol reutilizable en otras superficies del sistema,
 * así que no asciende a token semántico: mismo criterio D10 de
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` y el
 * que ya documenta `contact.layers.ts:1-27` para sus propios literales.
 *
 * ENMIENDA 2026-09-13, por decisión del dueño: este casi-negro pinta TAMBIÉN
 * el fondo oscuro de `About`, que va justo antes del pie y lleva su mismo
 * campo de estrellas (`scenes/starField`). Sigue sin ascender a token
 * semántico porque no es un rol nuevo: es la MISMA banda estrellada extendida
 * una sección hacia arriba, y `About.test.tsx` compara el fondo de las dos
 * superficies en cada tema para que no puedan divergir (regla 13). Cambiar
 * este valor exige volver a medir el contraste del texto de About, además del
 * del pie.
 */
export const FOOTER_DARK_BG = "oklch(0.055 0.01 288)";

/**
 * Los tres tintes posibles de una estrella. La tabla guarda esta RANURA, no
 * el color ya resuelto (D4): con dos tonalidades, guardar el CSS compuesto
 * habría obligado a duplicar la tabla entera o a hacer cirugía de cadenas
 * sobre el `box-shadow` -- las dos, peores que este cambio de forma.
 */
export type FooterStarTintKey = "white" | "secondary" | "primary";

/**
 * Una estrella del campo titilante del footer. Geometría en porcentaje
 * (posición relativa al rectángulo del footer, D9) y en píxeles (tamaño),
 * ranura de tinte y blur del halo (D4), y tiempos propios de la animación
 * `starTwinkle` de cada estrella.
 */
export interface FooterStar {
  readonly id: number;
  /** Posición vertical, `"NN.NN%"`. */
  readonly top: string;
  /** Posición horizontal, `"NN.NN%"`. */
  readonly left: string;
  /** Diámetro, `"N.Npx"`. */
  readonly size: string;
  /** Ranura de tinte -- ver `footerStarTint` para cómo se resuelve por tema. */
  readonly tintKey: FooterStarTintKey;
  /** Radio de difuminado del halo en px, o `null` si esta estrella no lleva
   *  halo -- ver `footerStarGlow` para cómo se compone el `box-shadow`. */
  readonly glowBlurPx: number | null;
  /** Duración de `starTwinkle` para esta estrella, en ms. */
  readonly durationMs: number;
  /** Retardo de `starTwinkle` para esta estrella, en ms. */
  readonly delayMs: number;
}

/**
 * L/C/H de cada tinte OSCURO, VERBATIM del mockup (L185: `oklch(1 0 0/`,
 * `oklch(.73 .195 311.928/`, `oklch(.8 .117 235.851/`), SIN alfa: el punto y
 * el halo comparten el mismo hue/croma/luminosidad y solo difieren en el
 * alfa que cada uno aplica (D4) -- 0.95 el punto (L192: `background: c +
 * '.95)'`), 0.7 el halo (L193). D18: ningún hue/croma se redondea a un paso
 * de `palette.*`.
 */
const DARK_STAR_LCH: Record<FooterStarTintKey, string> = {
  white: "1 0 0",
  secondary: "0.73 0.195 311.928",
  primary: "0.8 0.117 235.851",
};

/** Alfa del punto de una estrella oscura (mockup L192). */
export const FOOTER_STAR_DARK_POINT_ALPHA = 0.95;
/** Alfa del halo de una estrella oscura (mockup L193). */
export const FOOTER_STAR_DARK_GLOW_ALPHA = 0.7;

function darkStarColor(key: FooterStarTintKey, alpha: number): string {
  return `oklch(${DARK_STAR_LCH[key]} / ${alpha})`;
}

/**
 * Los tres tintes del mockup, ya con el alfa del PUNTO (0.95) embebido --
 * VERBATIM, D18. Se conservan como exports propios (en vez de resolverse
 * solo dentro de `footerStarTint`) porque `footer.layers.test.ts` los usa
 * como candado de que la composición oscura no se ha desviado del literal
 * original.
 */
export const STAR_TINT_WHITE = darkStarColor(
  "white",
  FOOTER_STAR_DARK_POINT_ALPHA,
);
export const STAR_TINT_SECONDARY = darkStarColor(
  "secondary",
  FOOTER_STAR_DARK_POINT_ALPHA,
);
export const STAR_TINT_PRIMARY = darkStarColor(
  "primary",
  FOOTER_STAR_DARK_POINT_ALPHA,
);

const DARK_STAR_POINT: Record<FooterStarTintKey, string> = {
  white: STAR_TINT_WHITE,
  secondary: STAR_TINT_SECONDARY,
  primary: STAR_TINT_PRIMARY,
};

/**
 * Tonalidad CLARA del campo de estrellas (D3 de la spec
 * `2026-08-07-footer-beam-estrellas-tema-claro-design.md`). Los tintes
 * oscuros de arriba son VERBATIM del mockup y no se tocan (D5); la rama
 * clara NO es un recoloreado a ojo de esos literales, es una construcción
 * PARALELA con pasos reales de `theme.data.palette` -- mismo criterio D1 que
 * ya aplica `sectionBeam.layers.ts` al haz, y mismo recurso que
 * `pillarBadgeAccent` en `Story.tsx`: recibir `palette` por parámetro (en
 * vez de leer `theme.data.palette` aquí dentro) es lo que permite que
 * `footer.layers.test.ts` mida el valor REAL devuelto contra los mismos
 * tokens que consume `Footer.tsx`, sin copiar la tabla D3 a mano en el test.
 *
 * Mapeo ranura -> familia de la rampa: `white` -> `neutral[500]` (17 de las
 * 24 estrellas, el "polvo" de fondo), `secondary`/`primary` -> el paso 500
 * de su propia rampa (mismos hues 311.928/235.851 que los literales
 * oscuros, D2 del haz aplicado aquí también: es la misma constelación en
 * otra tinta, no otra pieza).
 *
 * Los dos alfas son MENORES que en oscuro (0.95 el punto, 0.7 el halo) y NO
 * por simetría automática: `FOOTER_STAR_LIGHT_ALPHA = 0.8` (no 0.95) porque
 * un punto OSCURO sobre fondo CLARO pesa más que uno claro sobre fondo
 * oscuro con el mismo alfa -- la asimetría perceptiva habitual del
 * contraste simultáneo. 24 puntos a alfa 0.95 sobre `neutral[100]`
 * (`semantic.surfaceSunken`, el fondo del footer claro) leerían como
 * suciedad, no como polvo de estrellas. `FOOTER_STAR_LIGHT_GLOW_ALPHA =
 * 0.35` (frente a 0.7 en oscuro) por el mismo motivo que ya documenta D2 del
 * haz para sus `drop-shadow`: un halo oscuro sobre fondo claro es una
 * sombra, no un resplandor, y a alfa alta se lee como mancha sucia bajo el
 * punto.
 *
 * El alfa se añade con `color-mix(in oklab, <token> N%, transparent)`,
 * premultiplicado y por tanto sin desplazar el tono -- mismo recurso que
 * `ScCardBadge` en `Story.tsx` y que `beamMidLight` et al. en
 * `sectionBeam.layers.ts`. **NO se inventan literales de color nuevos**
 * (manual del repo, §5).
 */
export const FOOTER_STAR_LIGHT_ALPHA = 0.8;
export const FOOTER_STAR_LIGHT_GLOW_ALPHA = 0.35;

function footerStarLightToken(
  palette: ThemeDefinition["palette"],
  key: FooterStarTintKey,
): string {
  if (key === "secondary") return palette.secondary[500];
  if (key === "primary") return palette.primary[500];
  return palette.neutral[500];
}

/** `alpha` (0-1) al entero porcentual que espera `color-mix()`, con
 *  redondeo -- `alpha * 100` puede caer en un flotante con cola de
 *  imprecisión binaria (p. ej. `0.35 * 100`) y el candado byte a byte de
 *  `footer.layers.test.ts` exige una cadena exacta, no `"35.00000000000001%"`. */
function alphaToPercent(alpha: number): string {
  return `${Math.round(alpha * 100)}%`;
}

/** Punto de una estrella claro: mezcla del token de su ranura al
 *  `FOOTER_STAR_LIGHT_ALPHA` sobre `transparent` (D3). */
function footerStarTintLight(
  palette: ThemeDefinition["palette"],
  key: FooterStarTintKey,
): string {
  return `color-mix(in oklab, ${footerStarLightToken(palette, key)} ${alphaToPercent(FOOTER_STAR_LIGHT_ALPHA)}, transparent)`;
}

/** Halo de una estrella claro: mezcla del MISMO token al
 *  `FOOTER_STAR_LIGHT_GLOW_ALPHA`, menor que el del punto (D3). */
function footerStarGlowTintLight(
  palette: ThemeDefinition["palette"],
  key: FooterStarTintKey,
): string {
  return `color-mix(in oklab, ${footerStarLightToken(palette, key)} ${alphaToPercent(FOOTER_STAR_LIGHT_GLOW_ALPHA)}, transparent)`;
}

/**
 * Color del PUNTO (círculo) de una estrella para el tema activo (D3/D4/D5).
 * La bifurcación vive AQUÍ, contra `theme.isLight` -- mismo criterio que
 * `themedBeamColor` en `sectionBeam.parts.tsx`, adaptado a función simple
 * porque este valor no entra por una interpolación de styled-components
 * sino por el atributo `style` de cada `ScStar` (`scenes/starField/StarField.tsx`
 * desde el 2026-09-13, docblock de `ScStar`: el template tiene que seguir
 * siendo ESTÁTICO por rendimiento, así
 * que la composición ocurre en JS, no en CSS).
 */
export function footerStarTint(
  theme: ThemeDefinition,
  key: FooterStarTintKey,
): string {
  return theme.isLight
    ? footerStarTintLight(theme.palette, key)
    : DARK_STAR_POINT[key];
}

/**
 * `box-shadow` completo del halo de una estrella para el tema activo, o
 * `null` si esta estrella no lleva halo (D4): `0 0 <blur>px 1px <tinte a la
 * alfa de halo>`. Esta relación NO es nueva -- `footer.layers.test.ts` ya la
 * afirmaba como invariante sobre cadenas ya compuestas; ahora es la propia
 * forma en que estos datos se combinan.
 */
export function footerStarGlow(
  theme: ThemeDefinition,
  key: FooterStarTintKey,
  blurPx: number | null,
): string | null {
  if (blurPx === null) return null;
  const glowTint = theme.isLight
    ? footerStarGlowTintLight(theme.palette, key)
    : darkStarColor(key, FOOTER_STAR_DARK_GLOW_ALPHA);
  return `0 0 ${blurPx}px 1px ${glowTint}`;
}

/**
 * 24 entradas ESCRITAS A MANO, deterministas y variadas (D10) -- no una
 * llamada a `Math.random()` en render.
 *
 * Por qué no `Math.random()`: este sitio es `output: 'export'` (static
 * export) y SÍ hidrata en cliente (a diferencia del mockup, cuyo runtime de
 * boceto no hidrata y por eso puede permitirse un LCG sembrado en cada
 * render -- `Footer animado v2.dc.html` L180-184, `s = (s * 16807) %
 * 2147483647`). Si esta tabla se generase con `Math.random()` durante el
 * render, el marcado del HTML prerenderizado en build y el del primer render
 * en cliente diferirían -- mismatch de hidratación garantizado, no
 * hipotético, para cada una de las 24 estrellas en cada carga de página. La
 * forma correcta de "sembrado y determinista" en un sitio que hidrata es
 * congelar el RESULTADO en datos: React renderiza la misma tabla en las dos
 * pasadas porque es la misma tabla, literalmente. Efecto lateral bueno:
 * queda testeable por constantes exactas (`footer.layers.test.ts`), no por
 * propiedades estadísticas de una muestra aleatoria.
 *
 * Distribución (mismos pesos que el generador del mockup, L188: ~70% blanco,
 * el resto repartido entre los otros dos tintes): 17 blancas, 4 del tinte
 * secundario, 3 del primario. Tamaños entre 1.0px y 3.4px (mockup L187: `1 +
 * rnd()*2.4`). Posiciones repartidas por todo el rectángulo del footer, no
 * agrupadas en una esquina. Halo (`glowBlurPx`) en 6 de las 24 (~25%, mockup
 * L189: `rnd() > 0.72` → ~28%), con el blur dentro del rango `6..14` que usa
 * el generador (mockup L193). El `box-shadow` completo -- forma, tinte y
 * alfa -- se compone en el render con `footerStarGlow` (D4), no aquí.
 */
export const FOOTER_STARS: readonly FooterStar[] = [
  {
    id: 1,
    top: "8.20%",
    left: "12.75%",
    size: "1.6px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 2800,
    delayMs: 1200,
  },
  {
    id: 2,
    top: "15.40%",
    left: "63.10%",
    size: "2.4px",
    tintKey: "secondary",
    glowBlurPx: 10,
    durationMs: 4100,
    delayMs: 2000,
  },
  {
    id: 3,
    top: "22.65%",
    left: "34.05%",
    size: "1.2px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3300,
    delayMs: 900,
  },
  {
    id: 4,
    top: "5.10%",
    left: "88.30%",
    size: "1.8px",
    tintKey: "primary",
    glowBlurPx: null,
    durationMs: 5200,
    delayMs: 3100,
  },
  {
    id: 5,
    top: "30.85%",
    left: "5.60%",
    size: "2.0px",
    tintKey: "white",
    glowBlurPx: 8,
    durationMs: 2500,
    delayMs: 1600,
  },
  {
    id: 6,
    top: "44.20%",
    left: "71.90%",
    size: "1.4px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3900,
    delayMs: 2400,
  },
  {
    id: 7,
    top: "12.35%",
    left: "47.50%",
    size: "3.4px",
    tintKey: "secondary",
    glowBlurPx: 13,
    durationMs: 4700,
    delayMs: 1100,
  },
  {
    id: 8,
    top: "60.75%",
    left: "18.20%",
    size: "1.0px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 2200,
    delayMs: 800,
  },
  {
    id: 9,
    top: "52.40%",
    left: "92.15%",
    size: "2.2px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3600,
    delayMs: 2900,
  },
  {
    id: 10,
    top: "38.55%",
    left: "27.80%",
    size: "1.6px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 5800,
    delayMs: 1700,
  },
  {
    id: 11,
    top: "70.10%",
    left: "55.35%",
    size: "1.9px",
    tintKey: "primary",
    glowBlurPx: 9,
    durationMs: 3100,
    delayMs: 2300,
  },
  {
    id: 12,
    top: "18.90%",
    left: "76.40%",
    size: "1.3px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 4400,
    delayMs: 1400,
  },
  {
    id: 13,
    top: "82.55%",
    left: "9.85%",
    size: "2.6px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 2900,
    delayMs: 3500,
  },
  {
    id: 14,
    top: "66.30%",
    left: "39.70%",
    size: "1.1px",
    tintKey: "secondary",
    glowBlurPx: null,
    durationMs: 3700,
    delayMs: 1000,
  },
  {
    id: 15,
    top: "90.15%",
    left: "64.55%",
    size: "1.7px",
    tintKey: "white",
    glowBlurPx: 11,
    durationMs: 5000,
    delayMs: 2600,
  },
  {
    id: 16,
    top: "25.75%",
    left: "96.20%",
    size: "1.4px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3400,
    delayMs: 1900,
  },
  {
    id: 17,
    top: "47.60%",
    left: "15.30%",
    size: "2.1px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 6000,
    delayMs: 3600,
  },
  {
    id: 18,
    top: "8.90%",
    left: "41.65%",
    size: "1.5px",
    tintKey: "primary",
    glowBlurPx: null,
    durationMs: 2600,
    delayMs: 1300,
  },
  {
    id: 19,
    top: "55.20%",
    left: "82.75%",
    size: "1.8px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 4900,
    delayMs: 2100,
  },
  {
    id: 20,
    top: "33.45%",
    left: "60.10%",
    size: "1.0px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3000,
    delayMs: 1500,
  },
  {
    id: 21,
    top: "76.85%",
    left: "24.40%",
    size: "2.9px",
    tintKey: "secondary",
    glowBlurPx: 14,
    durationMs: 4300,
    delayMs: 2800,
  },
  {
    id: 22,
    top: "14.60%",
    left: "6.95%",
    size: "1.2px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 3800,
    delayMs: 900,
  },
  {
    id: 23,
    top: "62.35%",
    left: "87.50%",
    size: "1.6px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 5500,
    delayMs: 3200,
  },
  {
    id: 24,
    top: "95.70%",
    left: "45.10%",
    size: "1.3px",
    tintKey: "white",
    glowBlurPx: null,
    durationMs: 2700,
    delayMs: 1000,
  },
];

/**
 * Keyframe `starTwinkle`, VERBATIM del mockup (L29: `0%,100%{opacity:.12;
 * transform:scale(.8);}50%{opacity:1;transform:scale(1.15);}}`). Solo
 * `transform`/`opacity`. Geometría, tamaños, duraciones, retardos y este
 * keyframe no cambian entre temas (D3): es la misma constelación, en otra
 * tinta.
 */
export const FOOTER_STAR_TWINKLE_MIN_OPACITY = 0.12;
export const FOOTER_STAR_TWINKLE_MIN_SCALE = 0.8;
export const FOOTER_STAR_TWINKLE_MAX_SCALE = 1.15;
