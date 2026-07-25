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
 * Centro del ojo medido sobre el lienzo (833.8, 450.9): ligeramente por encima
 * del centro geométrico. Ancla la pupila, y con ella el anillo de pulso y el
 * velo de contraste del hero.
 */
export const EYE_CENTER = { x: "49.87%", y: "47.92%" } as const;

/**
 * Diámetro visual de la pupila como porcentaje del ANCHO del marco: el borde
 * exterior del degradado pupila→corona está en r ≈ 310px sobre 1672px de
 * ancho, o sea 2·310/1672 ≈ 37%.
 */
export const EYE_PUPIL_SIZE = "37%";

/**
 * Lado de la caja del mascota (Wormhole/Sol) que vive en el centro del ojo,
 * como porcentaje del ANCHO del marco.
 *
 * No es el diámetro de la pupila (37%) sino algo mayor a propósito. Dos
 * motivos, los dos medidos sobre la composición: el anillo exterior del
 * Wormhole se dibuja en el borde de su caja, y a 37% quedaría pegado al borde
 * de la pupila, leyéndose como un recorte y no como una construcción propia;
 * y el velo de contraste del hero (elipse de radios 32%×30% anclada al mismo
 * centro) apaga justo la zona de la pupila, así que un mascota que cupiera
 * dentro de ella quedaría enteramente bajo el velo. A 52% los anillos
 * exteriores y el halo de Sol respiran por fuera del velo, alrededor de la
 * copia, y solo el núcleo queda atenuado — que es donde va el texto.
 */
export const EYE_MASCOT_SIZE = "52%";
