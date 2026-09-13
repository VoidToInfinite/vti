/**
 * Tabla de capas de la escena "Celestial Orbital" (fondo de Features, tema
 * oscuro). Datos (orden, profundidad de parallax, calidad y peso de cada
 * pista) medidos y documentados en
 * `assets/features-celestial-orbital/manifest.json`. Mismo criterio que
 * `storyCosmicBeing.layers.ts`/
 * `journeyCosmicPortal.layers.ts`: se declara aquí en TypeScript en vez de
 * leer un manifest en tiempo de ejecución.
 *
 * Origen: `Features_Dark_Theme_2_celestial_parallax_capas_3_FIXED.zip`
 * (Downloads, entregado 2026-08-02), lienzo 3344x1882. 7 capas máster PNG:
 * `01-fondo` es OPACA (RGB) y hace de suelo del stack; las otras seis son
 * RGBA de alpha RECTA, pensadas para componerse con alpha NORMAL.
 *
 * Sustituye a "Celestial Guide" (`featuresCelestialGuide/`, borrada con esta
 * entrega). No era una actualizacion del mismo arte: es otro paquete y otra
 * generacion de arte, con otro modelo de composicion. "Celestial Guide" era
 * una particion de energia ADITIVA (sus diez capas sumaban con
 * `plus-lighter` sobre un negro-azulado); aqui, igual que en
 * `journeyCosmicPortal.layers.ts`, aplicarles `plus-lighter` a estas siete
 * capas las lavaria, asi que `ScLayer` (`featuresCelestialOrbital.parts.tsx`)
 * no declara ningun `mix-blend-mode` (D12 de la spec).
 */

export interface FeaturesCelestialOrbitalLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /**
   * Ruta publica del WebP a ancho nativo (2560px, reescalado desde el
   * 3344px del paquete). Deuda declarada (spec §10, mismo criterio que
   * `journeyCosmicPortal.layers.ts`): el master de 3344px no esta
   * versionado en este repo, asi que en viewports de mas de 1280px CSS a
   * DPR 2 el activo queda submuestreado.
   */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /**
   * Variante de 1600px (Task 11, plan premium F1-F5): pista intermedia para
   * que un movil a DPR3 (slot de ~1125px efectivos con `sizes=100vw`) deje
   * de pedir la de 2560px. Generada desde la pista de 2560 ya desplegada
   * (LANCZOS + method=6, calidad de esta escena) porque el master de 3344px
   * no esta versionado -- ver `assets/features-celestial-orbital/manifest.json`,
   * seccion `midTrack20260811`, para la medicion completa.
   */
  readonly srcMedium: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano mas cercano. */
  readonly depth: number;
}

/**
 * El orden es el del DEMO del paquete (`demo/index.html:152-159`), que pinta
 * la plataforma DEBAJO de los iconos, no el del README, que los lista al
 * reves. La eleccion esta MEDIDA, no supuesta (D13 de la spec): compuestos
 * los 7 PNG maestro en los dos ordenes, la diferencia es de 0.0/255 de media
 * por canal y el bounding box de la diferencia es `None` (solo 18 pixeles
 * tienen alfa en las dos capas a la vez) — son equivalentes en fidelidad. Se
 * elige entonces el orden coherente con el parallax: la plataforma tiene
 * menos profundidad (0.327) que los iconos (0.545), y pintarla encima de
 * ellos leeria como un plano cercano moviendose mas despacio que uno lejano.
 */
export const FEATURES_ORBITAL_LAYERS: readonly FeaturesCelestialOrbitalLayer[] =
  [
    {
      part: "fondo",
      src: "/features/celestial-orbital/01-fondo.webp",
      srcSmall: "/features/celestial-orbital/01-fondo-1024.webp",
      srcMedium: "/features/celestial-orbital/01-fondo-1600.webp",
      depth: 0.091,
    },
    {
      part: "ondas",
      src: "/features/celestial-orbital/02-ondas.webp",
      srcSmall: "/features/celestial-orbital/02-ondas-1024.webp",
      srcMedium: "/features/celestial-orbital/02-ondas-1600.webp",
      depth: 0.255,
    },
    {
      part: "orbita",
      src: "/features/celestial-orbital/03-orbita.webp",
      srcSmall: "/features/celestial-orbital/03-orbita-1024.webp",
      srcMedium: "/features/celestial-orbital/03-orbita-1600.webp",
      depth: 0.4,
    },
    {
      part: "plataforma",
      src: "/features/celestial-orbital/04-plataforma.webp",
      srcSmall: "/features/celestial-orbital/04-plataforma-1024.webp",
      srcMedium: "/features/celestial-orbital/04-plataforma-1600.webp",
      depth: 0.327,
    },
    {
      part: "iconos",
      src: "/features/celestial-orbital/05-iconos.webp",
      srcSmall: "/features/celestial-orbital/05-iconos-1024.webp",
      srcMedium: "/features/celestial-orbital/05-iconos-1600.webp",
      depth: 0.545,
    },
    {
      part: "figura",
      src: "/features/celestial-orbital/06-figura.webp",
      srcSmall: "/features/celestial-orbital/06-figura-1024.webp",
      srcMedium: "/features/celestial-orbital/06-figura-1600.webp",
      depth: 0.691,
    },
    {
      part: "particulas",
      src: "/features/celestial-orbital/07-particulas.webp",
      srcSmall: "/features/celestial-orbital/07-particulas-1024.webp",
      srcMedium: "/features/celestial-orbital/07-particulas-1600.webp",
      depth: 1,
    },
  ] as const;

/**
 * `sizes` de la escena -- rama móvil añadida por decisión del dueño en el
 * gate F2 (2026-08-11, plan premium F1-F5, Task 30):
 * `(max-width: 700px) 340px, 100vw`. Mismo mecanismo que
 * `STORY_COSMIC_BEING_SIZES` (Task 12, 2026-08-09), aplicado aquí tras
 * re-juzgarlo con la pista `1600w` ya desplegada (Task 11): el dueño revisó
 * en el gate F2 pares del compuesto real a la pista `1600w` (la que pedía
 * `sizes="100vw"` en móvil DPR3 antes de esta tarea) contra una simulación a
 * la pista `1024w` (la que pide esta rama nueva) y aceptó la degradación
 * como suficiente, con un ahorro medido de 759.720 B en las 16 capas de las
 * 3 escenas (Features/Journey/Contact) y el presupuesto de "página entera,
 * oscuro, móvil DPR3" de `PRE-LAUNCH-QA.md` §4 pasando de 3.164.894 B a
 * ~2,41 MB, por debajo del umbral de 3 MB por primera vez.
 *
 * El porqué exacto, con las 3 pistas reales de `srcSet`
 * (`${layer.srcSmall} 1024w, ${layer.srcMedium} 1600w, ${layer.src} 2560w`):
 * el algoritmo de selección de `w` del navegador elige, para una caja de
 * `340px` (el término bajo `max-width: 700px`), la pista de MENOR densidad
 * (`ancho-pista / 340`) que sea `>=` al DPR real. Las tres densidades
 * disponibles son `1024/340 ≈ 3,01`, `1600/340 ≈ 4,71` y `2560/340 ≈ 7,53`.
 * Como la densidad de la pista de 1024px (≈3,01) YA es `>=` a cualquier DPR
 * real hasta ese mismo 3,01, esa es la pista elegida en DPR1, DPR2 **y**
 * DPR3 por igual -- no solo en DPR3 (verificado en navegador real con
 * `playwright-cli`, `currentSrc`, en los 3 DPR: ver el informe de la
 * Task 30). Haría falta un DPR por encima de ~3,01 (infrecuente en
 * dispositivos reales) para que el navegador saltase a la pista de 1600px.
 *
 * En desktop (`>= 700px` de viewport) la escena SIGUE yendo a sangre
 * (`100vw` intacto, sin cambio de comportamiento respecto a antes de esta
 * tarea): a 1280px de caja, `1280/1280 = 1` de densidad para la pista de
 * 1600px es la más baja `>=` DPR1, así que ahí se sigue pidiendo por encima
 * de 1024px -- el mismo comportamiento que ya tenía `100vw` a secas.
 *
 * Alcance de esta decisión: las 3 escenas por capas que quedaban fuera de
 * la Task 12 (`storyCosmicBeing` ya la tenía) -- `FEATURES_ORBITAL_SIZES`
 * (este fichero), `JOURNEY_PORTAL_SIZES` y `CONTACT_GUARDIAN_SIZES`, las
 * tres re-juzgadas juntas en el mismo gate con el mismo mecanismo.
 */
export const FEATURES_ORBITAL_SIZES = "(max-width: 700px) 340px, 100vw";

/** Escala base comun a las 7 capas: evita bordes vacios al desplazar. Es el
 *  6% que ya usaba la escena saliente, sin cambio (D14 no lo toca).
 *
 *  Ninguna capa OPACA puede descubrir su borde con el parallax: la unica
 *  opaca es `01-fondo`, a profundidad 0.091, cuyo desplazamiento vertical
 *  maximo es `6 x 0.091 + 32 x 0.091 ≈ 3.5px` frente a los ~27px de
 *  sobreancho que da `overscan 1.06` sobre una pantalla de 900px. Las otras
 *  seis capas son transparentes: desplazarlas no descubre ningun borde. */
export const FEATURES_ORBITAL_OVERSCAN = 1.06;

/**
 * Negro-violeta del lienzo, literal `--bg` del `:root` de
 * `demo/index.html` del paquete. Copiado VERBATIM, no convertido a
 * `oklch()` — mismo criterio que `JOURNEY_PORTAL_VOID`. Es un color DISTINTO
 * del `#02040e` que usaba la escena saliente (`FEATURES_CELESTIAL_VOID`)
 * porque es otro paquete y otra generacion de arte, no una referencia
 * compartida.
 *
 * Aqui pinta MENOS que en la escena aditiva saliente: `01-fondo` es opaca y
 * lo tapa entero, asi que este color solo se ve como fondo de pintado antes
 * de que esa capa cargue (va en `loading="lazy"`) y como tope de la viñeta.
 */
export const FEATURES_ORBITAL_VOID = "#150b2e";

/**
 * Amplitud del parallax de puntero en px, a profundidad 1. NO es la del
 * paquete (calibrada para un hero suelto: 32px de puntero, 240px de
 * scroll — ver `FEATURES_ORBITAL_SCROLL_AMP`): se fija para CONSERVAR el
 * recorrido que esta seccion ya tenia. La escena saliente usaba
 * `{x:22,y:13}` con profundidad maxima 0.46, es decir 10.1/6.0 px de
 * puntero; con el ancla en 1.0, `{x:10,y:6}` reproduce 10.0/6.0 px. Cambiar
 * el fondo no debe retunear el movimiento de la seccion — mismo
 * razonamiento literal que `JOURNEY_PORTAL_POINTER_AMP`.
 */
export const FEATURES_ORBITAL_POINTER_AMP = { x: 10, y: 6 } as const;

/**
 * Amplitud del parallax de scroll en px, a profundidad 1. Mismo criterio que
 * `FEATURES_ORBITAL_POINTER_AMP`: la escena saliente usaba `70` con
 * profundidad maxima 0.46 (32.2 px); con el ancla en 1.0, `32` reproduce
 * 32.0 px.
 */
export const FEATURES_ORBITAL_SCROLL_AMP = 32;
