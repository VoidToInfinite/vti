/**
 * Tabla de capas del ojo cósmico. Los datos (orden, blending, profundidad de
 * parallax) y la geometría vienen medidos del lienzo original y están
 * documentados en `assets/hero-eye/manifest.json`, junto a los PNG fuente.
 *
 * Se declaran aquí en TypeScript en vez de leer el manifest en tiempo de
 * ejecución: son cinco constantes que no cambian entre despliegues, y un
 * `fetch` del JSON añadiría un round-trip en la ruta crítica del hero para no
 * aportar nada. El manifest sigue siendo la fuente documental; este archivo es
 * su transcripción tipada.
 *
 * Las capas 00–04 forman una partición de la imagen: sus máscaras suman 1 en
 * cada píxel, así que compuestas con blending ADITIVO sobre negro reconstruyen
 * el original (verificado por el manifest con RMS 0.007). Cualquier otro
 * blending — `normal` incluido — produce halos y bordes sucios en las
 * transiciones con feathering: el aditivo no es una preferencia estética, es
 * la condición bajo la que se extrajeron las máscaras.
 *
 * La capa `05-logo.png` NO se monta aquí: en el hero, la pupila la ocupa la
 * marca real del DOM (`BrandName`, el `<h1>` de la página), que es texto
 * accesible y traducible. El PNG del logotipo queda en `assets/hero-eye/` por
 * si otra superficie lo necesita.
 */

export interface EyeLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta pública del WebP a ancho nativo (1672px). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos (ver `EYE_SIZES`). */
  readonly srcSmall: string;
  /**
   * Profundidad de parallax, 0 = plano de fondo inmóvil, 1 = plano más
   * cercano. Multiplica la amplitud del seguimiento del cursor: que la pupila
   * se mueva más que el párpado es lo que produce la profundidad (spec §7).
   */
  readonly depth: number;
  /** `false` solo para la base opaca: el resto es luz que se suma. */
  readonly additive: boolean;
  /** Pulso lento de luminosidad (opacidad). `undefined` = capa quieta. */
  readonly glow?: "strong" | "soft";
}

export const EYE_LAYERS: readonly EyeLayer[] = [
  {
    part: "background",
    src: "/hero/eye/00-background.webp",
    srcSmall: "/hero/eye/00-background-1024.webp",
    depth: 0,
    additive: false,
  },
  {
    part: "eyelid",
    src: "/hero/eye/01-eyelid-outline.webp",
    srcSmall: "/hero/eye/01-eyelid-outline-1024.webp",
    depth: 0.25,
    additive: true,
  },
  {
    part: "nebula",
    src: "/hero/eye/02-nebula-field.webp",
    srcSmall: "/hero/eye/02-nebula-field-1024.webp",
    depth: 0.45,
    additive: true,
  },
  {
    part: "iris",
    src: "/hero/eye/03-iris-glow.webp",
    srcSmall: "/hero/eye/03-iris-glow-1024.webp",
    depth: 0.65,
    additive: true,
    glow: "strong",
  },
  {
    part: "pupil",
    src: "/hero/eye/04-pupil.webp",
    srcSmall: "/hero/eye/04-pupil-1024.webp",
    depth: 0.85,
    additive: true,
    glow: "soft",
  },
] as const;

/**
 * `sizes` de las capas. La condición declara MENOS ancho del real en pantallas
 * pequeñas (60vw, cuando en vertical el marco mide 185vw) a propósito: sin el
 * tope, un móvil de 390px con DPR 3 pediría ~2000px y se llevaría el archivo
 * de 1672px — el doble de bytes por una nitidez que un campo de nebulosa
 * difuso no rentabiliza. Con 60vw cualquier móvil elige la variante de
 * 1024px. En escritorio la declaración es honesta.
 */
export const EYE_SIZES = "(max-width: 700px) 60vw, 100vw";

/** Relación de aspecto del lienzo original (1672 × 941). */
export const EYE_ASPECT = "1672 / 941";

/**
 * Centro sobre el que se anclan las piezas que van «dentro» del ojo: la
 * mascota, el anillo de pulso y el velo de contraste del hero.
 *
 * El centro geométrico de la pupila pintada, medido sobre el lienzo, es
 * (833.8, 450.9) → 49.87% / 47.92%. El valor en uso corre 2 puntos más abajo:
 * es un ajuste de encuadre hecho a ojo sobre el render, no la medida cruda.
 */
export const EYE_CENTER = { x: "49.87%", y: "49.92%" } as const;

/**
 * Lado de lo que se monta dentro de la pupila (mascota y anillo de pulso),
 * como porcentaje del ANCHO del marco.
 *
 * No es el diámetro completo de la pupila pintada: ese, medido, es ≈37% (el
 * borde exterior del degradado pupila→corona está en r ≈ 310px sobre 1672px
 * de ancho). El valor en uso es el del pozo interior, ajustado sobre el
 * render, para que lo que se posa dentro no toque el borde de la corona.
 */
export const EYE_PUPIL_SIZE = "20%";

/**
 * Profundidad de parallax del mascota que ocupa el centro del ojo
 * (Wormhole/Sol). Es la MISMA que la de la capa `pupil`, y no un valor
 * propio, a propósito: la mascota se lee como el contenido de la pupila, así
 * que si se movieran a distinta velocidad se despegarían del pozo que las
 * sostiene en cuanto el cursor saliera del centro. `eye.layers.test.ts` lo
 * ata a la tabla de capas para que no puedan divergir.
 */
export const EYE_MASCOT_DEPTH = 0.85;
