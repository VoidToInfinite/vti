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
 * sizes de las capas -- DECISION D-E (dueno, 2026-08-09, plan premium F1-F5,
 * Task 12): `(max-width: 700px) 340px, 100vw`. El dueno revisó pares
 * actual/simulación (capturas a 375px con y sin este `sizes` móvil) y
 * aceptó la degradación resultante como suave: bajo 700px de viewport a
 * DPR3, `340 * 3 = 1020px` cae por debajo de los 1280px de la pista nativa,
 * así que el navegador elige la pista de 1024px en vez de la de 1280px
 * (mismo mecanismo que ya limitaba a Aura/Eye a su pista reducida en móvil,
 * `AURA_SIZES`/`EYE_SIZES`). La escena SIGUE yendo a sangre (ancho y alto
 * completos del viewport, `100vw` intacto en desktop) -- lo que cambia es
 * que, en móvil, se le miente A PROPÓSITO al navegador sobre el ancho real
 * de la caja para que baje una pista más ligera, a cambio de la nitidez que
 * el dueño ya juzgó y aceptó. Alcance ESTRICTO de esta decisión: solo esta
 * escena (`storyCosmicBeing`). `FEATURES_ORBITAL_SIZES`, `JOURNEY_PORTAL_SIZES`
 * y `CONTACT_GUARDIAN_SIZES` NO se tocan aquí -- se re-juzgan aparte en el
 * gate F2 del plan con la pista `1600w` que la Task 11 acaba de añadir.
 */
export const STORY_COSMIC_BEING_SIZES = "(max-width: 700px) 340px, 100vw";

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
 * Amplitud del parallax de scroll en px, a profundidad 1. Hasta la Task 20
 * (plan premium F1-F5, "motion resto") era 190 -- motionHints.scrollTravelPx
 * del manifest de esta escena, frente a los 70 de "Cosmic Heart" -- un valor
 * muy por encima de sus tres hermanas (`CONTACT_GUARDIAN_SCROLL_AMP`,
 * `FEATURES_ORBITAL_SCROLL_AMP`, `JOURNEY_PORTAL_SCROLL_AMP`, las tres en 32,
 * normalizadas contra su capa mas cercana en `depth: 1`).
 *
 * Esta escena NO normaliza sus 11 capas a `depth: 1` en la mas cercana (la
 * mas cercana, `heart-core`, se queda en `depth: 0.72` -- ver
 * `STORY_COSMIC_BEING_LAYERS`, arriba): renormalizar las 11 profundidades
 * habria sido un cambio mucho mas amplio que el que pide el brief de Task 20
 * ("scrollAmp 190 -> el valor de sus hermanas, 32"), asi que aqui se iguala
 * la CONSTANTE de amplitud, no el recorrido efectivo en pixeles.
 *
 * MEDIDO en navegador real (Chrome, `playwright-cli`, build de produccion
 * servido en `localhost:3600`, capturas y barrido numerico del informe de la
 * tarea): el termino de scroll de `useSceneParallax` (`scrollProgress *
 * scrollAmp * depth`) solo se mueve de forma perceptible en la VENTANA DE
 * TRANSICION de ~700-800px de scroll en la que la escena entra o sale del
 * pin (`position: sticky`) -- MIENTRAS la escena permanece anclada a pantalla
 * completa (la inmensa mayoria del recorrido del deck, varios miles de px),
 * `scrollProgress` apenas se mueve (~0 a ~0.07) y el termino de scroll
 * contribuye menos de 3px en cualquiera de las dos versiones -- ahi el
 * cambio de amplitud es indistinguible.
 *
 * En la capa mas cercana (`heart-core`, `depth: 0.72`), el barrido numerico
 * dio, en la MISMA posicion de scroll con los DOS builds (antes/despues):
 * entrada (scrollY 100) de -114,12px a -23,90px; salida (scrollY 6400) de
 * +141,82px a +18,74px -- un recorte de ~5,9-7,6x en la ventana de
 * transicion (esta escena queda en 32 * 0,72 = 23,04px de recorrido efectivo
 * maximo, ligeramente por debajo de los 32 * 1 = 32px de sus hermanas,
 * consecuencia aceptada de igualar la CONSTANTE y no el recorrido -- ver
 * arriba). Verificado que la escena sigue leyendose como parallax real y no
 * como imagen estatica: las 11 capas conservan su orden y su proporcion
 * relativa de movimiento entre si (cada `depth` sigue multiplicando el mismo
 * `scrollAmp`), solo con una ventana de transicion mas suave -- ver el
 * informe de la tarea (Task 20) para el barrido completo y las capturas.
 */
export const STORY_COSMIC_BEING_SCROLL_AMP = 32;
