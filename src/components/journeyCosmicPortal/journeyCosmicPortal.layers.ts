/**
 * Tabla de capas de la escena "Cosmic Portal" (fondo de Journey, tema
 * oscuro). Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/journey-cosmic-portal/manifest.json`. Mismo criterio que
 * `storyCosmicBeing.layers.ts`: se declara aquí en TypeScript en vez de leer
 * el manifest en tiempo de ejecución.
 *
 * Sustituye a "Astral Pathway" (`journeyAstralPathway/`, borrada con esta
 * entrega). No era una actualización del mismo arte: es otra escena, con
 * otros contenidos por capa y —lo que de verdad cambia el código— otro
 * modelo de composición. "Astral Pathway" era una partición de energía
 * ADITIVA (sus cinco capas sumaban con `plus-lighter` sobre un negro); aquí
 * `01-background` es OPACA y las otras cuatro llevan alpha RECTA con el
 * color despremultiplicado, pensadas para componerse con alpha NORMAL.
 * Aplicarles `plus-lighter` las lavaría, así que `ScLayer`
 * (`journeyCosmicPortal.parts.tsx`) no declara ningún `mix-blend-mode`.
 */

export interface JourneyCosmicPortalLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /**
   * Ruta pública del WebP a ancho nativo (2560px, reescalado desde el 3344px
   * del paquete). Se conserva el 2560 de la escena anterior: la caja nunca
   * crece más allá de `JOURNEY_PORTAL_MAX_WIDTH` (1280px CSS), así que 2560
   * es exactamente lo que pide una pantalla a DPR 2 y servir el 3344
   * original no aportaría nitidez.
   */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano más cercano. */
  readonly depth: number;
}

/**
 * Las profundidades son las PROPORCIONES que publica el paquete en su tabla
 * de integración (columna `data-depth`: 0.015 / 0.045 / 0.09 / 0.14 / 0.19 /
 * 0.24), normalizadas a 1.0 en la figura —que es como las usa su propia demo,
 * cuyo bucle divide por `DMAX = 0.24`—. Lo que NO se adopta es su amplitud de
 * 46px: está calibrada para un hero a viewport completo, y aquí la escena
 * vive en una caja de 1280px. Ver `JOURNEY_PORTAL_POINTER_AMP`.
 *
 * `hologram-disc` es una capa nueva de la v6 del paquete: el disco del suelo
 * vivía antes dentro de la figura y al separarse las capas se leía cortado
 * (truncado en r=205 con un fundido de solo 40px, cuando la textura de ondas
 * del arte sigue hasta r≈300, y con la silueta amputada a la derecha del
 * núcleo). Ahora es un disco íntegro de 360° con crossfade radial ancho, en
 * su propio plano entre los portales y la figura.
 */
export const JOURNEY_PORTAL_LAYERS: readonly JourneyCosmicPortalLayer[] = [
  {
    part: "background",
    src: "/journey/cosmic-portal/01-background.webp",
    srcSmall: "/journey/cosmic-portal/01-background-1024.webp",
    depth: 0.063,
  },
  {
    part: "stars",
    src: "/journey/cosmic-portal/02-stars.webp",
    srcSmall: "/journey/cosmic-portal/02-stars-1024.webp",
    depth: 0.188,
  },
  {
    part: "light-path",
    src: "/journey/cosmic-portal/03-light-path.webp",
    srcSmall: "/journey/cosmic-portal/03-light-path-1024.webp",
    depth: 0.375,
  },
  {
    part: "portals",
    src: "/journey/cosmic-portal/04-portals.webp",
    srcSmall: "/journey/cosmic-portal/04-portals-1024.webp",
    depth: 0.583,
  },
  {
    part: "hologram-disc",
    src: "/journey/cosmic-portal/05-hologram-disc.webp",
    srcSmall: "/journey/cosmic-portal/05-hologram-disc-1024.webp",
    depth: 0.792,
  },
  {
    part: "figure",
    src: "/journey/cosmic-portal/06-figure.webp",
    srcSmall: "/journey/cosmic-portal/06-figure-1024.webp",
    depth: 1.0,
  },
] as const;

/** `sizes`: la escena llena el ancho de la caja de Journey, tope
 *  `JOURNEY_PORTAL_MAX_WIDTH`. Sin cambios respecto a la escena anterior:
 *  la caja es la misma. */
export const JOURNEY_PORTAL_SIZES = "(min-width: 1280px) 1280px, 100vw";

/** Escala base común a las 6 capas: evita bordes vacíos al desplazar. Es el
 *  6% que recomienda el paquete, y coincide con el que ya usaba la escena
 *  anterior de esta sección. */
export const JOURNEY_PORTAL_OVERSCAN = 1.06;

/**
 * Negro-violeta del lienzo, declarado por el paquete en el `:root` de su
 * demo (`--ink`). Copiado VERBATIM, no convertido a `oklch()` — mismo
 * criterio que `STORY_COSMIC_BEING_VOID`.
 *
 * Aquí pinta MENOS que en las escenas aditivas: `01-background` es opaca y
 * lo tapa entero, así que este color solo se ve como fondo de pintado antes
 * de que esa capa cargue (va en `loading="lazy"`) y como tope de la viñeta.
 * Las esquinas medidas de `01-background` dan `#12012a`, algo más claro; se
 * conserva el literal del paquete en vez de derivar uno propio porque es el
 * que el paquete declara y el que su demo usa detrás del stack.
 */
export const JOURNEY_PORTAL_VOID = "#0b0620";

/**
 * Amplitud del parallax de puntero en px, a profundidad 1. NO es la del
 * paquete (46px): esa se calibró para un hero a viewport completo. Se fija
 * para conservar el recorrido que YA tenía esta sección — actualizar el
 * fondo no debería retunear su movimiento. Con estas profundidades el
 * desplazamiento máximo queda en 10.0/6.0 px, frente a los 10.1/6.0 px que
 * daba "Astral Pathway" (amp 22/13 sobre una profundidad máxima de 0.46).
 */
export const JOURNEY_PORTAL_POINTER_AMP = { x: 10, y: 6 } as const;

/**
 * Amplitud del parallax de scroll en px, a profundidad 1. Mismo criterio que
 * `JOURNEY_PORTAL_POINTER_AMP`: 32 px máximos aquí frente a los 32.2 px de
 * "Astral Pathway" (amp 70 sobre profundidad máxima 0.46). El paquete sugiere
 * un scroll bastante más fuerte que su puntero, pero eso es un cambio de
 * movimiento, no de fondo.
 */
export const JOURNEY_PORTAL_SCROLL_AMP = 32;

/**
 * Caja de la sección (mismo patrón que `STORY_DARK_MAX_WIDTH`/
 * `STORY_DARK_HEIGHT`): acotada y centrada, no a sangre. Valores heredados
 * sin cambio de la escena anterior — la caja de Journey no es parte de esta
 * entrega.
 */
export const JOURNEY_PORTAL_MAX_WIDTH = "1280px";
export const JOURNEY_PORTAL_HEIGHT = "90dvh";
