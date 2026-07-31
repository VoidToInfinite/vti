/**
 * Tabla de capas de la escena "Learning Guide" (fondo de Features, tema
 * oscuro). Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/features-celestial-guide/manifest.json`, junto a los WebP fuente.
 * Mismo criterio que `storyCosmicBeing.layers.ts`/
 * `journeyAstralPathway.layers.ts`: se declara aquí en TypeScript en vez de
 * leer el manifest en tiempo de ejecución.
 *
 * 10 capas (v9 del paquete, sustituye una entrega anterior sin capas): 1
 * fondo + 2 de ambientación + 6 orbes (uno por icono: libro, bombilla,
 * birrete, cerebro, mando, gráfica) + la figura unida al holograma del
 * suelo. Las profundidades de los orbes van intercaladas (0.28→0.38) para
 * que cada burbuja derive a una velocidad ligeramente distinta con el
 * puntero ("enjambre orbital", README del paquete).
 */

export interface FeaturesCelestialGuideLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta pública del WebP a ancho nativo (2560px, reescalado desde el
   *  3344px original — mismo razonamiento que `STORY_COSMIC_HEART_LAYERS`:
   *  el contenedor nunca crece más allá de `FEATURES_DARK_MAX_WIDTH`, así
   *  que el 3344px original no aporta nitidez extra). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano más cercano. */
  readonly depth: number;
}

export const FEATURES_CELESTIAL_LAYERS: readonly FeaturesCelestialGuideLayer[] =
  [
    {
      part: "fondo",
      src: "/features/celestial-guide/01-fondo.webp",
      srcSmall: "/features/celestial-guide/01-fondo-1024.webp",
      depth: 0.04,
    },
    {
      part: "ambiente",
      src: "/features/celestial-guide/02-ambiente.webp",
      srcSmall: "/features/celestial-guide/02-ambiente-1024.webp",
      depth: 0.1,
    },
    {
      part: "estrellas",
      src: "/features/celestial-guide/03-estrellas.webp",
      srcSmall: "/features/celestial-guide/03-estrellas-1024.webp",
      depth: 0.18,
    },
    {
      part: "orb-book",
      src: "/features/celestial-guide/04-orb-book.webp",
      srcSmall: "/features/celestial-guide/04-orb-book-1024.webp",
      depth: 0.28,
    },
    {
      part: "orb-bulb",
      src: "/features/celestial-guide/05-orb-bulb.webp",
      srcSmall: "/features/celestial-guide/05-orb-bulb-1024.webp",
      depth: 0.3,
    },
    {
      part: "orb-cap",
      src: "/features/celestial-guide/06-orb-cap.webp",
      srcSmall: "/features/celestial-guide/06-orb-cap-1024.webp",
      depth: 0.32,
    },
    {
      part: "orb-brain",
      src: "/features/celestial-guide/07-orb-brain.webp",
      srcSmall: "/features/celestial-guide/07-orb-brain-1024.webp",
      depth: 0.34,
    },
    {
      part: "orb-gamepad",
      src: "/features/celestial-guide/08-orb-gamepad.webp",
      srcSmall: "/features/celestial-guide/08-orb-gamepad-1024.webp",
      depth: 0.36,
    },
    {
      part: "orb-chart",
      src: "/features/celestial-guide/09-orb-chart.webp",
      srcSmall: "/features/celestial-guide/09-orb-chart-1024.webp",
      depth: 0.38,
    },
    {
      part: "figura-holograma",
      src: "/features/celestial-guide/10-figura-holograma.webp",
      srcSmall: "/features/celestial-guide/10-figura-holograma-1024.webp",
      depth: 0.46,
    },
  ] as const;

/** `sizes`: mismo criterio que `STORY_COSMIC_HEART_SIZES`/
 *  `JOURNEY_ASTRAL_SIZES` — la escena llena el ancho de la caja de
 *  Features, tope `FEATURES_DARK_MAX_WIDTH`. */
export const FEATURES_CELESTIAL_SIZES = "(min-width: 1280px) 1280px, 100vw";

/** Escala base común a las 10 capas: evita bordes vacíos al desplazar. */
export const FEATURES_CELESTIAL_OVERSCAN = 1.06;

/**
 * Negro-azulado del lienzo (`--void` del paquete original,
 * `parallax-learning-guide.html` §`:root`). Copiado VERBATIM, no convertido
 * a `oklch()` — mismo criterio que `STORY_COSMIC_HEART_VOID`/
 * `JOURNEY_ASTRAL_VOID`. Es el MISMO literal que `JOURNEY_ASTRAL_VOID`
 * (`#02040e`) — coincidencia real, no una referencia cruzada: los dos
 * paquetes vienen de la misma generación y comparten el void, pero cada
 * sección declara su propia constante (no se importa una de la otra).
 */
export const FEATURES_CELESTIAL_VOID = "#02040e";

/** Amplitud del parallax de puntero en px, a profundidad 1. */
export const FEATURES_CELESTIAL_POINTER_AMP = { x: 22, y: 13 } as const;

/** Amplitud del parallax de scroll en px, a profundidad 1. */
export const FEATURES_CELESTIAL_SCROLL_AMP = 70;
