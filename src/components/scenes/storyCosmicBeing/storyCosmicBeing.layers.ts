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

/**
 * srcSet AVIF de una capa, derivado del WebP por sustitución de extensión.
 *
 * AVIF llegó el 2026-08-17 (palanca elegida por el dueño para el peso del
 * tema oscuro: la escena era el 58 % de la carga y su WebP ya estaba en su
 * óptimo — recomprimirlo salía MÁS grande, medido en el manifest). Cifras de
 * la conversión, medidas fichero a fichero: las 22 pistas ganan (la guarda
 * de ≥5 % no saltó ninguna), escena completa 2.002.824 → 1.111.842 B en
 * disco (−44,5 %), PSNR mínimo 48,96 dB (RGB premultiplicado) / 47,16 dB
 * (alfa) — sobre el umbral de aceptación de 45 dB que este manifest usa
 * desde la recompresión de alfa. PROCEDENCIA DECLARADA: los maestros PNG no
 * están en la máquina (solo en el zip de origen, no versionado), así que el
 * AVIF se transcodificó desde el WebP q70 desplegado y la referencia de
 * calidad ES ese WebP — la verdad visual que la QA aprobó — no el maestro.
 * Detalle completo en assets/story-cosmic-being/manifest.json.
 *
 * PREMULTIPLICACIÓN (ola O, frente defensivo): desde este cambio, las diez
 * pistas aditivas de cada ancho llevan el alfa YA multiplicado dentro del RGB
 * y NO publican canal alfa. No es una decisión de calidad, es aritmética: una
 * capa que se compone en `plus-lighter` aporta `αs × Cs` al resultado, así que
 * meter esa multiplicación en el fichero y publicarlo opaco da el MISMO píxel;
 * y con el fallback `screen` sobre la base opaca también sale idéntico
 * (`(1−αs)·Cb + αs·(Cs+Cb−Cs·Cb)` = `Cs'+Cb−Cs'·Cb` con `Cs' = αs·Cs`). Lo que
 * cambia es el peso: el canal alfa costaba el 90 % del fichero. Medido pista a
 * pista, las 20 aditivas pasan de 1.108.805 a 100.388 B (−90,9 %) y la escena
 * entera en su pista ancha de 1.280 px, de 655.523 a 59.696 B (−90,9 %); la
 * de 1.024, de 456.319 a 43.729 B. El caso extremo es 07-geometry: 309.350 →
 * 18.217 B, porque su RGB era casi blanco y toda la forma vivía en el alfa —
 * su contribución real a la escena tiene una media de 1,04/255.
 *
 * VERIFICADO EN CHROME REAL (no en jsdom, que no compone), y la cifra que
 * llevaba escrita aquí NO se reproducía: esta línea declaraba 47,86 dB en la
 * pista de 1.280 y 47,54 en la de 1.024, con el 97 % de los subpíxeles dentro
 * de ±2/255, sin decir a qué tamaño se había medido. Re-medido en la ola O+P
 * por dos caminos independientes que coinciden en 0,01 dB entre sí --el DOM
 * con el CSS de esta escena, y un canvas 2D en `lighter` a resolución nativa--
 * el resultado es 44,52 dB a 1.280 (MSE 2,2958, maxDelta 23/255, el 68,14 % de
 * los subpíxeles dentro de ±1 y el 94,15 % dentro de ±2, n = 2.764.800) y
 * 44,24 dB a 1.024 (MSE 2,4470, maxDelta 28/255, ±1 66,20 %, ±2 93,50 %). Se
 * escriben esas, con su método: composición sobre `#05010e`, capa 00 en
 * `source-over` y las diez restantes en `lighter`, a la resolución nativa de
 * cada pista, contra los mismos AVIF extraídos del commit anterior. La
 * referencia sigue siendo el estado desplegado, no un maestro.
 *
 * NO ES LA CIFRA QUE EL UMBRAL DE 45 dB JUZGA, y conviene no confundirlas: ese
 * umbral es del manifest y se mide sobre el compuesto premultiplicado POR
 * CAPA, no sobre la escena entera -- el propio manifest lo deja escrito en su
 * sección `psnrThreshold`, al corregir el mismo error de comparación en la
 * Task 11. Lo que mide este párrafo es la pérdida ADICIONAL que introduce este
 * paso sobre la escena completa; compararla con el umbral por capa sería
 * mezclar dos métricas, y por eso la cifra se declara sin veredicto.
 *
 * EL RECUENTO DE ESTRELLAS SÍ SE CONSERVA, y también se re-midió: los píxeles
 * por encima de umbral de luminancia caen −0,51 % (>64), −0,14 % (>96),
 * −0,04 % (>128), −0,09 % (>160), −0,27 % (>192) y −0,78 % (>224). La línea
 * anterior declaraba «−1,4 % a −3,3 %», es decir, era MÁS pesimista que la
 * medida: la conclusión se sostiene con margen, solo cambian los números.
 * Encoder: sharp/libaom `quality: 85, effort: 6,
 * chromaSubsampling: "4:4:4"` sobre el RGB premultiplicado, con la guarda por
 * pista de este manifest (≥5 % de ahorro o no se sustituye) — la única que
 * bajó a `quality: 70` fue 09-figure, que a 85 salía MÁS grande. Los WebP no
 * se tocan: siguen con su alfa, siguen siendo el fallback y la referencia.
 *
 * Derivación por convención (mismo nombre, extensión .avif) en vez de once
 * pares de rutas más en la tabla: la tabla no gana información repitiendo
 * cada ruta con otra extensión, y el riesgo real de una convención — que el
 * fichero derivado NO exista y el <source> apunte a un 404 silencioso — lo
 * cierra el candado de storyCosmicBeing.layers.test.ts, que comprueba con
 * node:fs que cada AVIF derivado existe de verdad en public/. Ese mismo
 * fichero de test cierra también la premultiplicación: ninguna pista aditiva
 * puede volver a llevar alfa sin ponerlo en rojo. Y desde la ola O+P cierra
 * además el PESO exacto de las veinte pistas aditivas, que es lo que ancla
 * este docblock al arte que de verdad hay en disco: si alguien vuelve a
 * codificar la escena, ese candado se pone en rojo y obliga a re-medir estas
 * cifras en vez de dejarlas describiendo un arte que ya no existe -- que es
 * exactamente cómo los 47,86 dB de arriba sobrevivieron sin que nada avisara. Y el peso total del arte del
 * tema oscuro contra el ancla de 1,5 MB lo cierra aparte
 * `scripts/check-dark-art-weight.mjs`, que corre dentro de `pnpm run ci`.
 */
export function storyCosmicBeingAvifSrcSet(
  layer: StoryCosmicBeingLayer,
): string {
  return `${layer.srcSmall.replace(/\.webp$/, ".avif")} 1024w, ${layer.src.replace(/\.webp$/, ".avif")} 1280w`;
}

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
