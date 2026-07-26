/**
 * Tabla de capas del fondo pastel del hero (composición "Aura", tema claro).
 * Los datos (orden, geometría, modelo de composición) vienen medidos del
 * lienzo original y están documentados en `assets/hero-aura/manifest.json`,
 * junto a los PNG fuente y el comando exacto de `sharp` usado en la
 * conversión a WebP.
 *
 * Se declaran aquí en TypeScript en vez de leer el manifest en tiempo de
 * ejecución, por el mismo motivo que documenta `eye.layers.ts`: son
 * constantes que no cambian entre despliegues, y un `fetch` del JSON añadiría
 * un round-trip en la ruta crítica del hero para no aportar nada. El
 * manifest sigue siendo la fuente documental; este archivo es su
 * transcripción tipada.
 *
 * ## El modelo de composición es `source-over` (alfa normal), NO aditivo
 *
 * A diferencia del ojo cósmico (`eye.layers.ts`), que suma luz sobre negro
 * con `mix-blend-mode: plus-lighter`, aquí cada capa lleva su propio alfa y
 * se apila con el blending por defecto del navegador — el mismo que compone
 * cualquier imagen normal sobre otra. La condición se verificó recomponiendo
 * las cinco capas originales (fondo, mano izquierda, mano derecha, orbe,
 * energía) en ese orden, con alfa normal, y comparando el resultado contra
 * dos referencias:
 *
 * | Comparación | Error medio | p99 | Máximo |
 * |---|---|---|---|
 * | vs `verificacion_recompuesta.png` (recomposición de control) | 0.49/255 | 1/255 | 1/255 |
 * | vs el arte original (`…Pastel Cosmic landing Page 2.png`) | 5.09/255 | 18/255 | 26/255 |
 *
 * Ese error, casi nulo, confirma el modelo. **Por eso ninguna capa de esta
 * composición lleva `mix-blend-mode`** (ver `ScAuraLayer` y `ScAuraField` en
 * `aura.parts.tsx`): copiar aquí el aditivo del ojo no sería una mejora
 * sino un bug — las máscaras de Aura se extrajeron bajo la condición
 * CONTRARIA a las del ojo (alfa normal, no una partición que suma 1 por
 * píxel), y componerlas con `plus-lighter` o `screen` las sobreexpondría y
 * ensuciaría los bordes con feathering.
 *
 * ## El orbe no se publica como imagen
 *
 * `04-orb.png` existe archivado en `assets/hero-aura/` como referencia
 * documental (misma convención que `05-logo.png` en `assets/hero-eye/`),
 * pero NO se sube a `public/`: el disco que ocupa su lugar en el arte lo
 * renderiza el componente `Sol` del DOM (`src/components/eye/mascots/Sol`),
 * no un WebP. Por eso `AURA_LAYERS` tiene cuatro entradas, no cinco — la
 * quinta profundidad (`AURA_ORB_DEPTH`) se exporta aparte, para el elemento
 * que sostiene a `Sol` (`ScOrbSlot`).
 *
 * ## De dónde sale cada número de geometría
 *
 * - `AURA_SURFACE`: media RGB de `00-field.png` sobre el lienzo completo
 *   (#F0F1FD), convertida a OKLCH. Es el color que se ve un instante antes
 *   de que el WebP del campo termine de decodificar (spec §3.5).
 * - `AURA_ORB`: centroide del orbe ponderado por alfa en el PNG original,
 *   (838.4, 391.7) px sobre un lienzo de 1672×941 = (50.14 %, 41.63 %)
 *   (spec §3.2). Es la posición del orbe DENTRO del marco del arte.
 * - `AURA_ANCHOR_X`: correlación cruzada de la plantilla de alfa del orbe
 *   contra el mockup de distribución (`…Page.png`); mejor ajuste a escala 1
 *   con el orbe del arte trasladado al 69.28 % del hero (spec §3.4). El eje
 *   Y de ese ajuste (36.52 %) NO se adopta: la geometría de §3.6 (los
 *   bordes de `05_energia_particulas.png`, transparente a la izquierda y
 *   opaco por los otros tres lados) obliga a fijar `ancY = 0.4163` — el
 *   mismo valor que `AURA_ORB.y` — para que el marco sangre sin recortar
 *   las manos, así que la posición vertical se hereda del centroide en vez
 *   de duplicarse como una constante propia.
 * - `AURA_ORB_SIZE`: el disco visible de `Sol` es `ScCoronaWrap`
 *   (92 % de `ScFaces`, que a su vez es el 82 % del slot que lo contiene) =
 *   75.4 % del lado del slot. Para que ese disco lea a los 21.5 % de ancho
 *   medidos en el arte original (spec §3.2: r ≈ 180 px, mitad del pico de
 *   alfa, sobre 1672 px de ancho), el slot debe medir 21.5 / 0.754 ≈ 28.5 %.
 *   Es un valor CALCULADO a partir del render de `Sol`, no una medida
 *   directa del arte — se calibra contra el resultado visual y se documenta
 *   la desviación si cambia, igual que `EYE_PUPIL_SIZE`.
 * - `AURA_ASPECT`: relación de aspecto del lienzo original, 1672×941 px,
 *   igual que `EYE_ASPECT`.
 */

export interface AuraLayer {
  /** Identifica la capa en el DOM (`data-part`) y como `key` de React. */
  readonly part: string;
  /** Ruta pública del WebP a ancho nativo (1672px). */
  readonly src: string;
  /** Variante de 1024px para viewports estrechos (ver `AURA_SIZES`). */
  readonly srcSmall: string;
  /**
   * Profundidad de parallax, 0 = plano de fondo inmóvil, 1 = plano más
   * cercano. Multiplica la amplitud del seguimiento del cursor, igual que
   * en `EyeLayer` (spec §5.1).
   */
  readonly depth: number;
  /**
   * `true`  → se pinta a sangre sobre el socket con `object-fit: cover`.
   * `false` → vive dentro del marco del sujeto, anclado por el orbe.
   *
   * Solo el campo (`00-field`) lo lleva a `true`: es un degradado difuso, así
   * que estirarlo es invisible y garantiza que no quede un solo píxel del
   * hero sin cubrir, sea cual sea la relación de aspecto del viewport. Las
   * manos y la energía sí tienen forma reconocible, así que van a escala
   * natural dentro del marco (spec §5.2).
   */
  readonly fullBleed: boolean;
}

export const AURA_LAYERS: readonly AuraLayer[] = [
  {
    part: "field",
    src: "/hero/aura/00-field.webp",
    srcSmall: "/hero/aura/00-field-1024.webp",
    depth: 0,
    fullBleed: true,
  },
  {
    part: "handLeft",
    src: "/hero/aura/01-hand-left.webp",
    srcSmall: "/hero/aura/01-hand-left-1024.webp",
    // Las dos manos comparten profundidad A PROPOSITO: son el mismo plano
    // físico del arte. Darles valores distintos las despegaría una de otra
    // al mover el cursor (spec §5.2).
    depth: 0.3,
    fullBleed: false,
  },
  {
    part: "handRight",
    src: "/hero/aura/02-hand-right.webp",
    srcSmall: "/hero/aura/02-hand-right-1024.webp",
    depth: 0.3,
    fullBleed: false,
  },
  {
    part: "energy",
    src: "/hero/aura/03-energy.webp",
    srcSmall: "/hero/aura/03-energy-1024.webp",
    depth: 0.55,
    fullBleed: false,
  },
] as const;

/**
 * `sizes` de las capas de Aura. Reutiliza LITERALMENTE la misma declaración
 * que `EYE_SIZES`, con el mismo razonamiento: declara MENOS ancho del real
 * en pantallas pequeñas (60vw, cuando en vertical el marco de Aura mide
 * 185vw, igual que el del ojo) a propósito, para que el `srcset` elija la
 * pista de 1024px en vez de la de 1672px — un móvil de 390px con DPR 3
 * pediría ~2000px y se llevaría el archivo nativo, el doble de bytes por una
 * nitidez que un fondo pastel difuso y unas manos que ocupan una franja del
 * viewport no rentabilizan. En escritorio la declaración es honesta (100vw).
 */
export const AURA_SIZES = "(max-width: 700px) 60vw, 100vw";

/** Relación de aspecto del lienzo original de Aura (1672 × 941), igual que
 *  la del ojo: es el mismo tamaño de lienzo de origen. */
export const AURA_ASPECT = "1672 / 941";

/**
 * Color medio del campo pastel (`00-field.png`), convertido a OKLCH: es lo
 * que se ve en `ScAuraBase` un instante antes de que el WebP de la capa
 * `field` termine de decodificar (spec §3.5, §6.2.1).
 *
 * Excepción de color sancionada, la misma que `EYE_SURFACE`: Aura es
 * `aria-hidden` y puramente decorativa, así que este literal no es un
 * `semantic.*` — un rol semántico cambiaría con el tema y esta composición
 * SOLO se monta en tema claro, por diseño (spec §7).
 */
export const AURA_SURFACE = "oklch(0.961 0.016 283)";

/** Posición del orbe DENTRO del marco del arte (medida, spec §3.2). */
export const AURA_ORB = { x: "50.14%", y: "41.63%" } as const;

/**
 * Eje X del hero al que se ancla el orbe (spec §3.4). El eje Y no tiene una
 * constante propia: lo fija la geometría del marco (`ScAuraSubject`, altura
 * exacta del hero, `top: 0`), que coincide numéricamente con `AURA_ORB.y`
 * (spec §3.6).
 */
export const AURA_ANCHOR_X = "69.28%";

/** Lado del slot de `Sol`, como porcentaje del ancho del marco del sujeto.
 *  Valor CALCULADO a partir del render de `Sol`, no una medida directa del
 *  arte (ver el docblock de cabecera). */
export const AURA_ORB_SIZE = "28.5%";

/**
 * Profundidad de parallax del orbe (`Sol`). Es la MÁS ALTA de la
 * composición — mayor que la de `energy` (0.55) — porque la energía NO
 * cubre el orbe en el arte original (spec §3.3: alfa media de la capa de
 * energía dentro del disco del orbe es 0/255 hasta r ≈ 120px), así que
 * `Sol` puede montarse como la capa más cercana al espectador sin perder
 * fidelidad. `aura.layers.test.ts` lo ata a la tabla para que no puedan
 * divergir, igual que `eye.layers.test.ts` ata `EYE_MASCOT_DEPTH`.
 */
export const AURA_ORB_DEPTH = 0.8;
