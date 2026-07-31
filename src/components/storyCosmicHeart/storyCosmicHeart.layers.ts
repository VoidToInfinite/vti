/**
 * Tabla de capas de la escena "Cosmic Heart" (fondo de Story, tema oscuro).
 * Datos (orden, profundidad de parallax) medidos y documentados en
 * `assets/story-cosmic-heart/manifest.json`, junto a los WebP fuente.
 *
 * Las 8 capas son una particion de energia (sus mascaras suman 1.0 por
 * pixel, ver el manifest): compuestas con blending ADITIVO sobre
 * `STORY_COSMIC_HEART_VOID` reconstruyen la imagen original. Igual que
 * `eye.layers.ts`, se declara aqui en TypeScript en vez de leer el manifest
 * en tiempo de ejecucion.
 */

export interface StoryCosmicHeartLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta publica del WebP a ancho nativo (1672px). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano mas cercano. */
  readonly depth: number;
  /** Pulso lento de opacidad. `undefined` = capa quieta salvo el parallax. */
  readonly glow?: "core";
}

export const STORY_COSMIC_HEART_LAYERS: readonly StoryCosmicHeartLayer[] = [
  {
    part: "deep-space",
    src: "/story/cosmic-heart/01-deep-space.webp",
    srcSmall: "/story/cosmic-heart/01-deep-space-1024.webp",
    depth: 0.03,
  },
  {
    part: "nebula-back",
    src: "/story/cosmic-heart/02-nebula-back.webp",
    srcSmall: "/story/cosmic-heart/02-nebula-back-1024.webp",
    depth: 0.09,
  },
  {
    part: "sparkles-far",
    src: "/story/cosmic-heart/03-sparkles-far.webp",
    srcSmall: "/story/cosmic-heart/03-sparkles-far-1024.webp",
    depth: 0.13,
  },
  {
    part: "geometry",
    src: "/story/cosmic-heart/04-geometry.webp",
    srcSmall: "/story/cosmic-heart/04-geometry-1024.webp",
    depth: 0.19,
  },
  {
    part: "nebula-front",
    src: "/story/cosmic-heart/05-nebula-front.webp",
    srcSmall: "/story/cosmic-heart/05-nebula-front-1024.webp",
    depth: 0.26,
  },
  {
    part: "sparkles-near",
    src: "/story/cosmic-heart/06-sparkles-near.webp",
    srcSmall: "/story/cosmic-heart/06-sparkles-near-1024.webp",
    depth: 0.34,
  },
  {
    part: "figure",
    src: "/story/cosmic-heart/07-figure.webp",
    srcSmall: "/story/cosmic-heart/07-figure-1024.webp",
    depth: 0.46,
  },
  {
    part: "heart-core",
    src: "/story/cosmic-heart/08-heart-core.webp",
    srcSmall: "/story/cosmic-heart/08-heart-core-1024.webp",
    depth: 0.5,
    glow: "core",
  },
] as const;

/**
 * `sizes` de las capas: desde la entrega de la presentacion (D7,
 * 2026-07-31) la escena ya NO se acota a `grid.containerMax` (1200px) —
 * ese tope acotaba el fondo de la caja centrada que tenia Story antes;
 * ahora `StoryCosmicHeart` llena el `stage` a sangre (ancho y alto
 * completos del viewport, pedido literal del encargo). Declarar 1200px
 * seguiria siendo tecnicamente valido pero mentiria al navegador: en
 * pantallas anchas elegiria la pista de 1024px para una caja que en
 * realidad mide 100vw, perdiendo nitidez. Se declara `100vw` a secas.
 */
export const STORY_COSMIC_HEART_SIZES = "100vw";

/** Escala base comun a las 8 capas: evita bordes vacios al desplazar. */
export const STORY_COSMIC_HEART_OVERSCAN = 1.06;

/**
 * Negro-violeta del lienzo (`--void` del paquete original, `parallax-demo.html`
 * §`:root`). Se copia VERBATIM en vez de convertir a `oklch()` (mismo criterio
 * que D10 de `2026-07-28-landing-v2-secciones-design.md`): un redondeo de
 * conversion desviaria el resultado del aditivo, calibrado contra este negro
 * exacto. Excepcion de color sancionada — igual que `EYE_SURFACE` — porque
 * esta escena es puramente decorativa y su identidad no cambia con el tema
 * (solo se monta en oscuro).
 */
export const STORY_COSMIC_HEART_VOID = "#05030f";

/** Amplitud del parallax de puntero en px, a profundidad 1. */
export const STORY_COSMIC_HEART_POINTER_AMP = { x: 22, y: 13 } as const;

/** Amplitud del parallax de scroll en px, a profundidad 1. */
export const STORY_COSMIC_HEART_SCROLL_AMP = 70;
