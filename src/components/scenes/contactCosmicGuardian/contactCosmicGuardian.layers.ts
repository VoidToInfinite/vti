/**
 * Tabla de capas de la escena "Cosmic Guardian" (fondo de Contact, tema
 * oscuro). Datos (orden, profundidad de parallax, blending por capa)
 * medidos y documentados en `assets/contact-cosmic-guardian/manifest.json`.
 * Mismo criterio que `featuresCelestialOrbital.layers.ts`/
 * `journeyCosmicPortal.layers.ts`: se declara aqui en TypeScript en vez de
 * leer un manifest en tiempo de ejecucion.
 *
 * Origen: `cosmic-guardian-parallax-kit.zip` (Downloads, entregado
 * 2026-08-04), lienzo 3344x1882. Sustituye por completo a "Neon Galaxy"
 * (`contactNeonGalaxy/`): es otro arte, otro modelo de composicion y, sobre
 * todo, otro LADO -- aquella dejaba la figura y los orbes a la izquierda y
 * el vacio a la derecha; esta lo hace al reves, con la figura ocupando la
 * mitad DERECHA del encuadre (60.71%-83.74% del ancho del lienzo, dato del
 * manifest).
 *
 * Solo 3 capas, frente a las 7 de la escena saliente: `01-fondo` es OPACA
 * (RGB) y hace de suelo del stack; `02-figura` es RGBA de alfa recta,
 * pensada para componerse con alpha NORMAL; `03-polvo` es RGBA y lleva
 * `mix-blend-mode: screen` (el unico blending no-normal de la escena, lo
 * pide el kit explicitamente: "capa sintetica opcional ... mix-blend-mode:
 * screen"). Es la primera escena del repo con blending POR CAPA en vez de
 * uniforme (`contactCosmicGuardian.parts.tsx`).
 *
 * Los tres orbes que traia el kit (`orb_chat.png`, `orb_phone.png`,
 * `orb_mail.png`) quedan excluidos: el usuario pidio no anadirlos al
 * cambiar el fondo, y el propio README del kit lo desaconseja -- son
 * sprites prestados de la imagen anterior, sin anclaje a este cielo, y los
 * tres canales de contacto que representaban ya viven como tarjetas reales
 * en el contenido de la seccion.
 */

export interface ContactCosmicGuardianLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /**
   * Ruta publica del WebP a ancho nativo (2560px, reescalado desde el
   * 3344px del paquete). Deuda declarada (mismo criterio que
   * `featuresCelestialOrbital.layers.ts`): el master de 3344px no esta
   * versionado en este repo.
   */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos. */
  readonly srcSmall: string;
  /**
   * Variante de 1600px (Task 11, plan premium F1-F5): pista intermedia para
   * que un movil a DPR3 (slot de ~1125px efectivos con `sizes=100vw`) deje
   * de pedir la de 2560px. Generada desde la pista de 2560 ya desplegada
   * (LANCZOS + method=6, calidad de esta escena) porque el master de 3344px
   * no esta versionado -- ver `assets/contact-cosmic-guardian/manifest.json`,
   * seccion `midTrack20260811`, para la medicion completa.
   */
  readonly srcMedium: string;
  /** Profundidad de parallax, 0 = plano de fondo, 1 = plano mas cercano. */
  readonly depth: number;
  /**
   * Modo de composicion de la capa. Solo `03-polvo` usa `"screen"`: el kit
   * lo pide explicitamente para esa capa y solo para ella (manifest,
   * `compositing.css`). Aplicarlo al fondo opaco o a la figura los lavaria
   * por completo -- son alpha normal a proposito, con el color
   * despremultiplicado para componerse asi.
   */
  readonly blend: "normal" | "screen";
}

/**
 * Orden = orden del kit (`z: 0, 1, 2` del manifest): fondo, figura, polvo.
 * Sin ambiguedad de orden que resolver (a diferencia de
 * `FEATURES_ORBITAL_LAYERS`): son 3 capas con una jerarquia de profundidad
 * fisica clara (fondo detras de todo, figura sobre el fondo, polvo estelar
 * flotando delante de la figura).
 */
export const CONTACT_GUARDIAN_LAYERS: readonly ContactCosmicGuardianLayer[] = [
  {
    part: "fondo",
    src: "/contact/cosmic-guardian/01-fondo.webp",
    srcSmall: "/contact/cosmic-guardian/01-fondo-1024.webp",
    srcMedium: "/contact/cosmic-guardian/01-fondo-1600.webp",
    depth: 0,
    blend: "normal",
  },
  {
    part: "figura",
    src: "/contact/cosmic-guardian/02-figura.webp",
    srcSmall: "/contact/cosmic-guardian/02-figura-1024.webp",
    srcMedium: "/contact/cosmic-guardian/02-figura-1600.webp",
    depth: 0.353,
    blend: "normal",
  },
  {
    part: "polvo",
    src: "/contact/cosmic-guardian/03-polvo.webp",
    srcSmall: "/contact/cosmic-guardian/03-polvo-1024.webp",
    srcMedium: "/contact/cosmic-guardian/03-polvo-1600.webp",
    depth: 1,
    blend: "screen",
  },
] as const;

/**
 * `sizes` de la escena: `100vw` a secas, NO el
 * `"(min-width: 1280px) 1280px, 100vw"` de la escena saliente
 * (`CONTACT_NEON_SIZES`). La seccion paso a sangre en la entrega de ayer
 * (spec `docs/superpowers/specs/2026-08-03-contacto-footer-oscuro-design.md`,
 * D6) y ya no vive dentro de una caja con tope de 1280px: aquel `sizes` se
 * quedo describiendo una caja que ya no existe -- le mentia al navegador y
 * le hacia elegir la pista de 1024px en pantallas anchas. Mismo cambio y
 * mismo motivo que `FEATURES_ORBITAL_SIZES` (D9 de la spec de Features).
 */
export const CONTACT_GUARDIAN_SIZES = "100vw";

/**
 * Escala base comun a las 3 capas: evita bordes vacios al desplazar. Mismo
 * 6% que ya usaba la escena saliente (`CONTACT_NEON_OVERSCAN`), sin cambio.
 *
 * La unica capa OPACA es `01-fondo`, y su profundidad es 0: no se mueve en
 * absoluto, asi que no puede descubrir ningun borde por mucho que se
 * scrollee. Las otras dos capas son transparentes: desplazarlas solo mueve
 * su contenido sobre lo que haya debajo. El overscan es, por tanto, holgura
 * de sobra y no una restriccion (manifest, `motion.opaqueEdgeCheck`).
 */
export const CONTACT_GUARDIAN_OVERSCAN = 1.06;

/**
 * Ancla vertical del encuadre de las 3 capas (`object-position`, eje Y),
 * decision D5 de la spec de navegacion fluida
 * (`docs/superpowers/specs/2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`).
 *
 * De donde sale el numero: la figura viene del sprite `figure.png`, de
 * 770x1803, pegado en `(2030, 55)` sobre el lienzo de 3344x1882 (manifest,
 * `geometry.figure`; bbox verificado `2030, 55, 2800, 1858`). Eso pone el
 * borde superior de la figura en `55 / 1882 = 2,92%` del alto del lienzo y
 * el inferior en `1858 / 1882 = 98,72%`.
 *
 * Que defecto corrige: con `object-fit: cover` y el defecto
 * `object-position: 50% 50%` (encuadre centrado), la franja del lienzo que
 * queda visible se centra en el 50% del alto, no en la figura. Medido
 * (spec, tabla D5/1.3): en cuanto la ventana es mas apaisada que ~1,83 la
 * franja visible arranca por debajo del 2,92% donde empieza la cabeza --
 * a 1366x650 la franja visible es 10,1%-89,9%, a 1920x930 es 9,4%-90,6%, a
 * 2560x1080 es 14,6%-85,4%; en los tres la cabeza queda fuera de cuadro.
 * Con la ancla en `0%` la franja visible SIEMPRE arranca en el borde
 * superior del lienzo, asi que la cabeza (que empieza en el 2,92%) esta
 * garantizada dentro del cuadro en todo el rango de viewports medido.
 *
 * Coste aceptado: todo el recorte de `cover` se va entero al borde
 * inferior (hasta perder el 29,3% del lienzo por abajo a 2560x1080). Es un
 * coste casi gratis: los pies (ultima fila de la figura, 98,72% del alto)
 * no se veian enteros en NINGUN viewport medido ni antes ni despues de este
 * cambio -- la ultima fila del arte ya caia siempre bajo el borde inferior
 * o bajo el tramo mas opaco de la vineta -- y esa misma banda inferior es
 * justo donde `ScVignette` (`contactCosmicGuardian.parts.tsx`) ya tapa el
 * arte por completo: su parada inferior en el regimen estrecho llega al
 * 97% de opacidad (`f7` en hexadecimal, alfa 247/255).
 *
 * NO se toca el encuadre horizontal (sigue en `50%`, el centro): ver D5,
 * seccion "Lo que NO se toca" de la spec -- excluido a proposito.
 */
export const CONTACT_GUARDIAN_FOCUS_Y = "0%";

/**
 * Negro-violeta del lienzo, literal `--void` de `demo/index.html` del kit
 * (`html,body{background:#0d0416}`). Copiado VERBATIM, no convertido a
 * `oklch()` -- mismo criterio que `CONTACT_NEON_VOID`/
 * `FEATURES_ORBITAL_VOID`. Solo se ve como color de pintado antes de que
 * cargue la capa opaca (va en `loading="lazy"`) y como fondo de la seccion
 * durante el solape con Features.
 */
export const CONTACT_GUARDIAN_VOID = "#0d0416";

/**
 * Amplitud del parallax de puntero en px, a profundidad 1. NO es la del
 * kit (que sugiere `depth: [0, 0.03, 0.085]` para un recorrido mas
 * contenido): se fija para CONSERVAR el recorrido que esta seccion ya
 * tenia. Las profundidades adoptadas (`CONTACT_GUARDIAN_LAYERS`) son las
 * proporciones del kit normalizadas a 1.0 en la capa mas cercana (el
 * polvo): 0 / 0.353 / 1.0. Normalizar aisla del retuneo del proveedor
 * (leccion del repo, 2026-08-01) y es lo que ya hacen
 * `JourneyCosmicPortal`/`FeaturesCelestialOrbital`. La escena saliente
 * usaba `{x:22,y:13}` con profundidad maxima 0.46, es decir 10.1/6.0 px de
 * puntero; con el ancla en 1.0, `{x:10,y:6}` reproduce 10.0/6.0 px. Cambiar
 * el fondo no debe retunear el movimiento de la seccion -- mismo
 * razonamiento literal que `FEATURES_ORBITAL_POINTER_AMP`.
 */
export const CONTACT_GUARDIAN_POINTER_AMP = { x: 10, y: 6 } as const;

/**
 * Amplitud del parallax de scroll en px, a profundidad 1. Mismo criterio
 * que `CONTACT_GUARDIAN_POINTER_AMP`: la escena saliente usaba `70` con
 * profundidad maxima 0.46 (32.2 px); con el ancla en 1.0, `32` reproduce
 * 32.0 px.
 */
export const CONTACT_GUARDIAN_SCROLL_AMP = 32;
