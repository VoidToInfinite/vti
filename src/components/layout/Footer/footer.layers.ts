/**
 * Constantes de la rama OSCURA del Footer (spec
 * `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`,
 * D9/D10/D17/D18). La rama clara no usa nada de este fichero: sigue
 * declarando `semantic.surfaceSunken` y su `border-top` sin cambios (D1).
 */

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
 */
export const FOOTER_DARK_BG = "oklch(0.055 0.01 288)";

/**
 * Una estrella del campo titilante del footer oscuro. Geometría en
 * porcentaje (posición relativa al rectángulo del footer, D9) y en píxeles
 * (tamaño), tinte y halo VERBATIM del mockup, y tiempos propios de la
 * animación `starTwinkle` de cada estrella.
 */
export interface FooterStar {
  readonly id: number;
  /** Posición vertical, `"NN.NN%"`. */
  readonly top: string;
  /** Posición horizontal, `"NN.NN%"`. */
  readonly left: string;
  /** Diámetro, `"N.Npx"`. */
  readonly size: string;
  /** Uno de `STAR_TINT_WHITE`/`STAR_TINT_SECONDARY`/`STAR_TINT_PRIMARY`. */
  readonly tint: string;
  /** `box-shadow` completo, o `null` si esta estrella no lleva halo. */
  readonly glow: string | null;
  /** Duración de `starTwinkle` para esta estrella, en ms. */
  readonly durationMs: number;
  /** Retardo de `starTwinkle` para esta estrella, en ms. */
  readonly delayMs: number;
}

/**
 * Los tres tintes del mockup (L185: `oklch(1 0 0/`, `oklch(.73 .195
 * 311.928/`, `oklch(.8 .117 235.851/`), con el alfa `.95` que L192 aplica al
 * fondo de cada estrella (`background: c + '.95)'`). VERBATIM, D18: ningún
 * hue/croma se redondea a un paso de `palette.*`.
 */
export const STAR_TINT_WHITE = "oklch(1 0 0 / 0.95)";
export const STAR_TINT_SECONDARY = "oklch(0.73 0.195 311.928 / 0.95)";
export const STAR_TINT_PRIMARY = "oklch(0.8 0.117 235.851 / 0.95)";

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
 * agrupadas en una esquina. Halo (`glow`) en 6 de las 24 (~25%, mockup L189:
 * `rnd() > 0.72` → ~28%): forma `0 0 <6..14>px 1px <mismo tinte, alfa 0.7>`
 * (mockup L193), con el blur dentro del rango `6..14` que usa el generador.
 */
export const FOOTER_STARS: readonly FooterStar[] = [
  {
    id: 1,
    top: "8.20%",
    left: "12.75%",
    size: "1.6px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 2800,
    delayMs: 1200,
  },
  {
    id: 2,
    top: "15.40%",
    left: "63.10%",
    size: "2.4px",
    tint: STAR_TINT_SECONDARY,
    glow: "0 0 10px 1px oklch(0.73 0.195 311.928 / 0.7)",
    durationMs: 4100,
    delayMs: 2000,
  },
  {
    id: 3,
    top: "22.65%",
    left: "34.05%",
    size: "1.2px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3300,
    delayMs: 900,
  },
  {
    id: 4,
    top: "5.10%",
    left: "88.30%",
    size: "1.8px",
    tint: STAR_TINT_PRIMARY,
    glow: null,
    durationMs: 5200,
    delayMs: 3100,
  },
  {
    id: 5,
    top: "30.85%",
    left: "5.60%",
    size: "2.0px",
    tint: STAR_TINT_WHITE,
    glow: "0 0 8px 1px oklch(1 0 0 / 0.7)",
    durationMs: 2500,
    delayMs: 1600,
  },
  {
    id: 6,
    top: "44.20%",
    left: "71.90%",
    size: "1.4px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3900,
    delayMs: 2400,
  },
  {
    id: 7,
    top: "12.35%",
    left: "47.50%",
    size: "3.4px",
    tint: STAR_TINT_SECONDARY,
    glow: "0 0 13px 1px oklch(0.73 0.195 311.928 / 0.7)",
    durationMs: 4700,
    delayMs: 1100,
  },
  {
    id: 8,
    top: "60.75%",
    left: "18.20%",
    size: "1.0px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 2200,
    delayMs: 800,
  },
  {
    id: 9,
    top: "52.40%",
    left: "92.15%",
    size: "2.2px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3600,
    delayMs: 2900,
  },
  {
    id: 10,
    top: "38.55%",
    left: "27.80%",
    size: "1.6px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 5800,
    delayMs: 1700,
  },
  {
    id: 11,
    top: "70.10%",
    left: "55.35%",
    size: "1.9px",
    tint: STAR_TINT_PRIMARY,
    glow: "0 0 9px 1px oklch(0.8 0.117 235.851 / 0.7)",
    durationMs: 3100,
    delayMs: 2300,
  },
  {
    id: 12,
    top: "18.90%",
    left: "76.40%",
    size: "1.3px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 4400,
    delayMs: 1400,
  },
  {
    id: 13,
    top: "82.55%",
    left: "9.85%",
    size: "2.6px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 2900,
    delayMs: 3500,
  },
  {
    id: 14,
    top: "66.30%",
    left: "39.70%",
    size: "1.1px",
    tint: STAR_TINT_SECONDARY,
    glow: null,
    durationMs: 3700,
    delayMs: 1000,
  },
  {
    id: 15,
    top: "90.15%",
    left: "64.55%",
    size: "1.7px",
    tint: STAR_TINT_WHITE,
    glow: "0 0 11px 1px oklch(1 0 0 / 0.7)",
    durationMs: 5000,
    delayMs: 2600,
  },
  {
    id: 16,
    top: "25.75%",
    left: "96.20%",
    size: "1.4px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3400,
    delayMs: 1900,
  },
  {
    id: 17,
    top: "47.60%",
    left: "15.30%",
    size: "2.1px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 6000,
    delayMs: 3600,
  },
  {
    id: 18,
    top: "8.90%",
    left: "41.65%",
    size: "1.5px",
    tint: STAR_TINT_PRIMARY,
    glow: null,
    durationMs: 2600,
    delayMs: 1300,
  },
  {
    id: 19,
    top: "55.20%",
    left: "82.75%",
    size: "1.8px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 4900,
    delayMs: 2100,
  },
  {
    id: 20,
    top: "33.45%",
    left: "60.10%",
    size: "1.0px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3000,
    delayMs: 1500,
  },
  {
    id: 21,
    top: "76.85%",
    left: "24.40%",
    size: "2.9px",
    tint: STAR_TINT_SECONDARY,
    glow: "0 0 14px 1px oklch(0.73 0.195 311.928 / 0.7)",
    durationMs: 4300,
    delayMs: 2800,
  },
  {
    id: 22,
    top: "14.60%",
    left: "6.95%",
    size: "1.2px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 3800,
    delayMs: 900,
  },
  {
    id: 23,
    top: "62.35%",
    left: "87.50%",
    size: "1.6px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 5500,
    delayMs: 3200,
  },
  {
    id: 24,
    top: "95.70%",
    left: "45.10%",
    size: "1.3px",
    tint: STAR_TINT_WHITE,
    glow: null,
    durationMs: 2700,
    delayMs: 1000,
  },
];

/**
 * Keyframe `starTwinkle`, VERBATIM del mockup (L29: `0%,100%{opacity:.12;
 * transform:scale(.8);}50%{opacity:1;transform:scale(1.15);}}`). Solo
 * `transform`/`opacity`.
 */
export const FOOTER_STAR_TWINKLE_MIN_OPACITY = 0.12;
export const FOOTER_STAR_TWINKLE_MIN_SCALE = 0.8;
export const FOOTER_STAR_TWINKLE_MAX_SCALE = 1.15;
