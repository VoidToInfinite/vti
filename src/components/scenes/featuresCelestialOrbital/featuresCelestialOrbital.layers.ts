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
 * `sizes` de la escena (D9 de la spec): `100vw` a secas, porque la escena va
 * a sangre (D7) y ya no vive dentro de una caja con tope de 1280px. El
 * `sizes` de la escena saliente (`"(min-width: 1280px) 1280px, 100vw"`) le
 * mentiria al navegador y le haria elegir la pista de 1024px en pantallas
 * anchas — mismo cambio y mismo motivo que `JOURNEY_PORTAL_SIZES`.
 */
export const FEATURES_ORBITAL_SIZES = "100vw";

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
