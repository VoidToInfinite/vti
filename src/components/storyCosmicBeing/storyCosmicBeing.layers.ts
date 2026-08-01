/**
 * Tabla de capas de la escena "Cosmic Being" (fondo de Story, tema oscuro).
 * Datos (orden, profundidad de parallax, modo de blend) medidos y
 * documentados en assets/story-cosmic-being/manifest.json, junto a los WebP
 * fuente.
 *
 * A diferencia de "Cosmic Heart" (storyCosmicHeart.layers.ts, ahora
 * obsoleta), esta escena NO es una particion de energia pura: la capa
 * 00-space-base es OPACA (blend "normal", base del stack) y las diez
 * restantes SI son aditivas (blend "plus-lighter") sobre ella. Igual que
 * eye.layers.ts y storyCosmicHeart.layers.ts, se declara aqui en TypeScript
 * en vez de leer el manifest en tiempo de ejecucion.
 */

/** Modo de composicion de una capa contra lo que hay detras. */
export type StoryCosmicBeingBlend = "normal" | "plus-lighter";

export interface StoryCosmicBeingLayer {
  /** Identifica la capa en el DOM (data-part) y como key de React. */
  readonly part: string;
  /** Ruta publica del WebP a ancho nativo (1280px). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano mas cercano. */
  readonly depth: number;
  /**
   * Modo de blend contra lo que hay debajo. "normal" solo lo lleva
   * 00-space-base (es opaca y hace de base del lienzo); las otras diez son
   * "plus-lighter" (aditivas, ver ScLayer en storyCosmicBeing.parts.tsx).
   */
  readonly blend: StoryCosmicBeingBlend;
  /** Pulso lento de opacidad. undefined = capa quieta salvo el parallax. */
  readonly glow?: "core";
}

export const STORY_COSMIC_BEING_LAYERS: readonly StoryCosmicBeingLayer[] = [
  {
    part: "space-base",
    src: "/story/cosmic-being/00-space-base.webp",
    srcSmall: "/story/cosmic-being/00-space-base-1024.webp",
    depth: 0.0,
    blend: "normal",
  },
  {
    part: "nebula",
    src: "/story/cosmic-being/01-nebula.webp",
    srcSmall: "/story/cosmic-being/01-nebula-1024.webp",
    depth: 0.1,
    blend: "plus-lighter",
  },
  {
    part: "galaxy",
    src: "/story/cosmic-being/02-galaxy.webp",
    srcSmall: "/story/cosmic-being/02-galaxy-1024.webp",
    depth: 0.12,
    blend: "plus-lighter",
  },
  {
    part: "stars-far",
    src: "/story/cosmic-being/03-stars-far.webp",
    srcSmall: "/story/cosmic-being/03-stars-far-1024.webp",
    depth: 0.16,
    blend: "plus-lighter",
  },
  {
    part: "stars-mid",
    src: "/story/cosmic-being/04-stars-mid.webp",
    srcSmall: "/story/cosmic-being/04-stars-mid-1024.webp",
    depth: 0.24,
    blend: "plus-lighter",
  },
  {
    part: "stars-near",
    src: "/story/cosmic-being/05-stars-near.webp",
    srcSmall: "/story/cosmic-being/05-stars-near-1024.webp",
    depth: 0.36,
    blend: "plus-lighter",
  },
  {
    part: "orbs",
    src: "/story/cosmic-being/06-orbs.webp",
    srcSmall: "/story/cosmic-being/06-orbs-1024.webp",
    depth: 0.44,
    blend: "plus-lighter",
  },
  {
    part: "geometry",
    src: "/story/cosmic-being/07-geometry.webp",
    srcSmall: "/story/cosmic-being/07-geometry-1024.webp",
    depth: 0.56,
    blend: "plus-lighter",
  },
  // Las dos capas de la figura se reparten distinto desde la entrega del
  // 2026-08-01 (zip 3): la mascara del cuerpo ya no sale de la luminancia sino
  // del canal MINIMO de RGB, asi que 09-figure es SOLO el cuerpo (recorte
  // cenido) y todo el borde luminoso que lo rodea vive ahora en
  // 08-figure-aura. El reparto de energia sigue siendo exacto, pero la
  // separacion de `depth` entre ambas ya no es cosmetica: cuanto mas se
  // separen, mas se despega el resplandor del cuerpo (queda de estela con el
  // aura). Los 0.05 de aqui son los del paquete y dan ~9.5px de desfase a
  // scroll completo con STORY_COSMIC_BEING_SCROLL_AMP; subirlos exagera ese
  // despegue.
  {
    part: "figure-aura",
    src: "/story/cosmic-being/08-figure-aura.webp",
    srcSmall: "/story/cosmic-being/08-figure-aura-1024.webp",
    depth: 0.63,
    blend: "plus-lighter",
  },
  {
    part: "figure",
    src: "/story/cosmic-being/09-figure.webp",
    srcSmall: "/story/cosmic-being/09-figure-1024.webp",
    depth: 0.68,
    blend: "plus-lighter",
  },
  {
    part: "heart-core",
    src: "/story/cosmic-being/10-heart-core.webp",
    srcSmall: "/story/cosmic-being/10-heart-core-1024.webp",
    depth: 0.72,
    blend: "plus-lighter",
    glow: "core",
  },
] as const;

/**
 * sizes de las capas: mismo criterio que STORY_COSMIC_HEART_SIZES
 * (storyCosmicHeart.layers.ts) -- la escena llena el stage a sangre (ancho y
 * alto completos del viewport), no la caja centrada de grid.containerMax.
 * Declarar un tope mentiria al navegador y le haria elegir la pista de
 * 1024px en pantallas anchas donde la caja real mide 100vw.
 */
export const STORY_COSMIC_BEING_SIZES = "100vw";

/** Escala base comun a las 11 capas: evita bordes vacios al desplazar. */
export const STORY_COSMIC_BEING_OVERSCAN = 1.02;

/**
 * Negro-violeta del lienzo (compositing.container del manifest.json de esta
 * escena). Se copia VERBATIM en vez de convertir a oklch() -- mismo criterio
 * ya sancionado para STORY_COSMIC_HEART_VOID (storyCosmicHeart.layers.ts) y
 * para EYE_SURFACE: un redondeo de conversion desviaria el resultado del
 * aditivo, calibrado contra este negro exacto. Distinto del literal de
 * "Cosmic Heart" (#05030f): este arte se calibro contra su propio negro,
 * documentado aqui tal cual lo publica el manifest.
 */
export const STORY_COSMIC_BEING_VOID = "#05010e";

/**
 * Amplitud del parallax de puntero en px, a profundidad 1. NO son los valores
 * de motionHints.swingXpx/swingYpx del manifest de esta escena (46/30): esos
 * son la sugerencia del paquete y aqui se bajaron a mano tras verlos en
 * pantalla. Tampoco reutiliza STORY_COSMIC_HEART_POINTER_AMP (22/13): un
 * lienzo y una composicion distintos piden su propia amplitud.
 */
export const STORY_COSMIC_BEING_POINTER_AMP = { x: 10, y: 20 } as const;

/**
 * Amplitud del parallax de scroll en px, a profundidad 1. Tomada de
 * motionHints.scrollTravelPx del mismo manifest (190, frente a los 70 de
 * "Cosmic Heart") -- misma razon que STORY_COSMIC_BEING_POINTER_AMP.
 */
export const STORY_COSMIC_BEING_SCROLL_AMP = 190;
