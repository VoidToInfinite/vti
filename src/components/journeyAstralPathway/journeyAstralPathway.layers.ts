/**
 * Tabla de capas de la escena "Astral Pathway" (fondo de Journey, tema
 * oscuro). Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/journey-astral-pathway/manifest.json`, junto a los WebP fuente.
 * Mismo criterio que `storyCosmicHeart.layers.ts`: se declara aquí en
 * TypeScript en vez de leer el manifest en tiempo de ejecución.
 */

export interface JourneyAstralPathwayLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta pública del WebP a ancho nativo (2560px, reescalado desde el
   *  3344px original — ver el docblock de `STORY_COSMIC_HEART_VOID` para el
   *  mismo razonamiento: el contenedor nunca crece más allá de
   *  `JOURNEY_ASTRAL_MAX_WIDTH`, así que servir el 3344px original no
   *  aporta nitidez extra). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano más cercano. */
  readonly depth: number;
}

export const JOURNEY_ASTRAL_LAYERS: readonly JourneyAstralPathwayLayer[] = [
  {
    part: "deep-space",
    src: "/journey/astral-pathway/01-deep-space.webp",
    srcSmall: "/journey/astral-pathway/01-deep-space-1024.webp",
    depth: 0.04,
  },
  {
    part: "path-far",
    src: "/journey/astral-pathway/02-path-far.webp",
    srcSmall: "/journey/astral-pathway/02-path-far-1024.webp",
    depth: 0.1,
  },
  {
    part: "stars",
    src: "/journey/astral-pathway/03-stars.webp",
    srcSmall: "/journey/astral-pathway/03-stars-1024.webp",
    depth: 0.2,
  },
  {
    part: "path-near",
    src: "/journey/astral-pathway/04-path-near.webp",
    srcSmall: "/journey/astral-pathway/04-path-near-1024.webp",
    depth: 0.3,
  },
  {
    part: "figure",
    src: "/journey/astral-pathway/05-figure.webp",
    srcSmall: "/journey/astral-pathway/05-figure-1024.webp",
    depth: 0.46,
  },
] as const;

/** `sizes`: mismo criterio que `STORY_COSMIC_HEART_SIZES` — la escena llena
 *  el ancho de la caja de Journey, tope `JOURNEY_ASTRAL_MAX_WIDTH`. */
export const JOURNEY_ASTRAL_SIZES = "(min-width: 1280px) 1280px, 100vw";

/** Escala base común a las 5 capas: evita bordes vacíos al desplazar. */
export const JOURNEY_ASTRAL_OVERSCAN = 1.06;

/**
 * Negro-azulado del lienzo (`--void` del paquete original,
 * `parallax-pathway.html` §`:root`). Copiado VERBATIM, no convertido a
 * `oklch()` — mismo criterio que `STORY_COSMIC_HEART_VOID`: el aditivo se
 * calibró contra este negro exacto y una conversión introduciría un error
 * de redondeo. Es DISTINTO del void de Story (`#05030f`): cada escena se
 * generó y calibró por separado, no hay ninguna razón para que compartan
 * literal.
 */
export const JOURNEY_ASTRAL_VOID = "#02040e";

/** Amplitud del parallax de puntero en px, a profundidad 1. */
export const JOURNEY_ASTRAL_POINTER_AMP = { x: 22, y: 13 } as const;

/** Amplitud del parallax de scroll en px, a profundidad 1. */
export const JOURNEY_ASTRAL_SCROLL_AMP = 70;

/**
 * Caja de la sección (mismo patrón que `STORY_DARK_MAX_WIDTH`/
 * `STORY_DARK_HEIGHT`, pedido explícito del usuario para Story y extendido
 * aquí por consistencia entre las secciones oscuras): acotada y centrada,
 * no a sangre.
 */
export const JOURNEY_ASTRAL_MAX_WIDTH = "1280px";
export const JOURNEY_ASTRAL_HEIGHT = "90dvh";
