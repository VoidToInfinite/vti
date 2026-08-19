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
 * cualquier imagen normal sobre otra. La condición se reverificó (revisión
 * 2026-07-27, spec §15.1, segundo lote de capas — extraídas con alfa por
 * distancia euclídea, inpainting gaussiano y descomposición de color real,
 * más riguroso que el primer lote) recomponiendo las SEIS capas del paquete
 * nuevo (`00_fondo → 01_nebulosa_particulas → 02_mano_izquierda →
 * 03_mano_derecha → 04_orbe → 05_destello_central`) en ese orden, con alfa
 * normal, y comparando el resultado contra dos referencias — medido de forma
 * independiente, no tomado sin verificar del `LEEME.md` del paquete:
 *
 * | Comparación | Error medio | p99 | Máximo |
 * |---|---|---|---|
 * | vs `verificacion_recompuesta.png` (control del paquete) | 0.42/255 | 1/255 | 1/255 |
 * | vs el arte original (`…Pastel Cosmic landing Page 2.png`) | 1.23/255 | 11/255 | 15/255 |
 *
 * ~4× más fiel que el primer lote (5.09/255 de error medio contra el
 * original). Ese error, casi nulo, confirma el modelo. **Por eso ninguna
 * capa de esta composición lleva `mix-blend-mode`** (ver `ScAuraLayer` y
 * `ScAuraField` en `aura.parts.tsx`): copiar aquí el aditivo del ojo no sería
 * una mejora sino un bug — las máscaras de Aura se extrajeron bajo la
 * condición CONTRARIA a las del ojo (alfa normal, no una partición que suma
 * 1 por píxel), y componerlas con `plus-lighter` o `screen` las
 * sobreexpondría y ensuciaría los bordes con feathering.
 *
 * ## El orbe no se publica como imagen, ni su núcleo
 *
 * El paquete de origen trae 6 archivos; solo 4 se publican. `04-orb.png`
 * (el anillo del orbe) y `05-core-glow.png` (su núcleo, separado del anillo
 * por primera vez en este segundo lote — el primero no lo distinguía)
 * existen archivados en `assets/hero-aura/` como referencia documental
 * (misma convención que `05-logo.png` en `assets/hero-eye/`), pero NINGUNO
 * de los dos sube a `public/`: el disco que ocupa su lugar en el arte lo
 * renderiza el componente `Sol` del DOM (`src/components/scenes/eye/mascots/Sol`),
 * no un WebP. `Sol` ya trae su propia corona Y su propio núcleo animado, así
 * que montar `05-core-glow.png` debajo produciría un doble núcleo — uno
 * pintado y fijo, otro animado, compitiendo por el mismo píxel (spec §15.2,
 * misma decisión que ya regía para el anillo, extendida ahora al núcleo
 * recién separado). Por eso `AURA_LAYERS` tiene cuatro entradas, no seis —
 * la quinta profundidad (`AURA_ORB_DEPTH`) se exporta aparte, para el
 * elemento que sostiene a `Sol` (`ScOrbSlot`).
 *
 * ## De dónde sale cada número de geometría
 *
 * - `AURA_SURFACE`: media RGB de `00-field.png` sobre el lienzo completo
 *   (233.5, 234.0, 250.9) → convertida por la matriz OKLab estándar (la
 *   misma familia que usa `contrast.ts`) a `oklch(0.942 0.023 285)`,
 *   verificado por ida y vuelta en el motor del navegador: resuelve a
 *   `rgb(234, 234, 251)`, a menos de una unidad del objetivo (spec §15.5).
 *   Es el color que se ve un instante antes de que el WebP del campo termine
 *   de decodificar (spec §3.5).
 * - `AURA_ORB`: centroide del orbe ponderado por alfa en `04_orbe.png`,
 *   (851.36, 392.70) px sobre un lienzo de 1672×941 = (50.92 %, 41.73 %)
 *   (spec §15.5). Es la posición del orbe DENTRO del marco del arte.
 * - `AURA_ANCHOR_X`: correlación cruzada de la plantilla de alfa del orbe
 *   contra el mockup de distribución (`…Page.png`); mejor ajuste a escala 1
 *   con el orbe del arte trasladado al 69.28 % del hero (spec §3.4). SIN
 *   CAMBIOS en esta revisión: el centroide del orbe apenas se movió (0.78 pp
 *   en X), lo que no justifica repetir la correlación cruzada (spec §15.5).
 *   El eje Y de ese ajuste (36.52 %) tampoco se adopta: se fija
 *   `ancY = 0.4173` — el mismo valor que `AURA_ORB.y` — para que el marco
 *   sangre sin recortar las manos, así que la posición vertical se hereda
 *   del centroide en vez de duplicarse como una constante propia. La
 *   geometría del encuadre (marco = 100 % del alto, anclado solo en X) se
 *   reverificó por render con la geometría nueva en 5 relaciones de aspecto
 *   (spec §15.6) — YA NO por un borde libre de alfa en la capa de energía,
 *   esa propiedad no existe en el paquete nuevo (ver el docblock de
 *   `ScAuraSubject` en `aura.parts.tsx` para el detalle completo).
 * - `AURA_ORB_SIZE`: el disco visible de `Sol` es `ScCoronaWrap`
 *   (92 % de `ScFaces`, que a su vez es el 82 % del slot que lo contiene) =
 *   75.4 % del lado del slot. Para que ese disco lea al 21.30 % de ancho
 *   medido en el arte nuevo (spec §15.5: r = 178.10 px, mitad del pico de
 *   alfa del anillo, interpolado con paso de 2px, sobre 1672 px de ancho),
 *   el slot debe medir 21.30 / 0.754 ≈ 28.254 %, redondeado a 28.3 %. Es un
 *   valor CALCULADO a partir del render de `Sol`, no una medida directa del
 *   arte — se calibra contra el resultado visual y se documenta la
 *   desviación si cambia, igual que `EYE_PUPIL_SIZE`.
 * - `AURA_ASPECT`: relación de aspecto del lienzo original, 1672×941 px,
 *   igual que `EYE_ASPECT`. El lienzo de origen no cambió entre lotes.
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
  /**
   * true si la capa tiene pista AVIF publicada (2026-08-18, extension de la
   * palanca del dueno al arte del hero). NO es una convencion: es el
   * RESULTADO de la guarda de la codificacion (>=5% de ahorro y >=45 dB de
   * PSNR contra el WebP de referencia).
   *
   * HOY LAS CUATRO CAPAS SON true. "energy" estuvo en false desde el
   * 2026-08-18 hasta la critica externa #13 (2026-08-20), y esa exclusion
   * estaba mal decidida: la guarda se evaluo sobre la pista de 1024 (-4,7%,
   * bajo el umbral) en vez de sobre la de 1672, que es la que descarga un
   * escritorio de 1440px -- y ahi el mismo quality=55 ahorra -11,3%
   * (157.568 -> 139.793 B, PSNR 42,65 dB). La leccion generalizable, escrita
   * aqui para el que venga: **una guarda de ahorro se evalua sobre la pista
   * que el visitante DESCARGA, no sobre la mas pequena del srcset.**
   *
   * El campo se conserva como dato por capa (no se colapsa a una constante)
   * porque la guarda puede volver a saltar en un lote futuro. Candado en
   * aura.layers.test.ts: cada capa avif:true tiene sus dos ficheros reales en
   * public/, cada avif:false NO puede tener derivado huerfano, y una sonda
   * positiva impide que el conjunto pase en verde por vacuidad.
   */
  readonly avif: boolean;
}

/**
 * Orden de apilado = orden de pintado en el DOM: `Aura.tsx` monta esta tabla
 * con `.map()`, cada capa es `position: absolute` sin `z-index` explícito,
 * así que gana el último hermano. El orden cambió respecto al primer lote
 * (`field → handLeft → handRight → energy`, energía por encima de todo) a
 * `field → energy → handLeft → handRight`: verificado por recomposición
 * (spec §15.3), la energía del segundo lote se compone DETRÁS de las manos,
 * no delante — de ahí también que la mano derecha de este lote traiga
 * "filamentos de energía adheridos": lo que antes pintaba la propia capa de
 * energía por encima de la mano, aquí queda atribuido a la capa de la mano,
 * porque la energía, yendo detrás, quedaría tapada por su parte opaca de
 * todos modos. Por el mismo motivo baja la `depth` de `energy` (ver más
 * abajo, spec §15.4).
 *
 * `AURA_STAGGER`, unas líneas más abajo en este mismo archivo, NO cambia de
 * orden pese a este reordenamiento: sigue siendo
 * `[field, handLeft, handRight, energy, orb]`, el orden de REVELADO del
 * cruce de temas que pide el encargo original, desacoplado del orden de
 * PINTADO que se acaba de cambiar aquí — `auraStep()` en `aura.parts.tsx`
 * busca por nombre de `data-part`, no por posición en este array, así que
 * los dos órdenes pueden divergir sin que ninguno rompa al otro.
 */
export const AURA_LAYERS: readonly AuraLayer[] = [
  {
    part: "field",
    src: "/hero/aura/00-field.webp",
    srcSmall: "/hero/aura/00-field-1024.webp",
    depth: 0,
    fullBleed: true,
    avif: true,
  },
  {
    part: "energy",
    src: "/hero/aura/01-energy.webp",
    srcSmall: "/hero/aura/01-energy-1024.webp",
    // Profundidad MENOR que las manos (0.30), no mayor: con la energía
    // pintándose detrás de las manos (ver el comentario de este array),
    // mantenerla en el 0.55 del primer lote sería físicamente incoherente
    // — lo que está detrás se mueve MENOS con el cursor, no más. Queda entre
    // el campo (0, inmóvil) y las manos (spec §15.4).
    depth: 0.15,
    fullBleed: false,
    /*
     * `false` hasta la crítica externa #13 (2026-08-20), y la exclusión estaba
     * MAL DECIDIDA: la guarda del 5 % se aplicó a la pista de 1024 (−4,7 %,
     * 63.084 → 60.145 B) y se dio por hecho que la capa no rentabilizaba AVIF.
     * Pero la pista que un escritorio de 1440 px descarga de verdad es la de
     * 1672, y ahí el mismo `quality=55` ya sancionado para las otras ocho
     * capas del hero ahorra **−11,3 % (157.568 → 139.793 B)** con PSNR 42,65
     * dB. Medido dos veces por partes independientes, mismo encoder que el
     * resto del lote (Pillow 12.3.0, `quality=55 speed=2`).
     *
     * Por qué importa más que 17 KB: esta capa ES el elemento LCP del tema
     * claro. El LCP claro no es un número sino una CARRERA — si la imagen
     * termina de descargar DESPUÉS de que arranque la rampa de revelado del
     * stack, entra como candidata y el LCP se dispara a ~5,2 s; si llega
     * mientras el stack sigue a `opacity: 0`, Chromium la registra invisible,
     * no la reencola nunca, y el LCP se queda en el wordmark (~1,2 s). El
     * margen medido era de −338 ms (llegaba tarde); con esta conversión pasa
     * a **+390 ms**, reproducible en 4/4 corridas estranguladas.
     */
    avif: true,
  },
  {
    part: "handLeft",
    src: "/hero/aura/02-hand-left.webp",
    srcSmall: "/hero/aura/02-hand-left-1024.webp",
    // Las dos manos comparten profundidad A PROPOSITO: son el mismo plano
    // físico del arte. Darles valores distintos las despegaría una de otra
    // al mover el cursor (spec §5.2).
    depth: 0.3,
    fullBleed: false,
    avif: true,
  },
  {
    part: "handRight",
    src: "/hero/aura/03-hand-right.webp",
    srcSmall: "/hero/aura/03-hand-right-1024.webp",
    depth: 0.3,
    fullBleed: false,
    avif: true,
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

/**
 * Descriptores de precarga del arte claro, hermanos exactos de `EYE_PRELOADS`
 * (`eye.layers.ts`) y con el mismo contrato: las claves tienen que coincidir
 * carácter a carácter con el `srcSet`/`sizes` que emite `Aura.tsx`, o el
 * navegador no reconocerá la precarga como la misma petición y descargará
 * cada capa DOS veces. `Aura.test.tsx` compara lo que el componente
 * RENDERIZA contra esta lista, no una constante contra otra.
 *
 * POR QUÉ EXISTE (2026-08-17). Hasta esta revisión el arte claro no
 * necesitaba precarga declarada: viajaba en el HTML estático como cuatro
 * `<img>`, y el Float de React 19 hoisteaba sus cuatro `<link rel="preload">`
 * al `<head>` por su cuenta. Eso daba un camino claro impecable a costa de
 * cobrarle al visitante OSCURO 309.276 B medidos de arte que no verá nunca
 * — el 13,1 % de su carga. Desde que `HeroBackdrop` dejó de emitir ningún
 * stack en el HTML (ver su docblock), ese hoisteo automático ya no ocurre:
 * las dos ramas se precargan igual, desde el script de arranque, que es el
 * único punto del sitio que conoce el tema resuelto antes de hidratar.
 *
 * El orden importa: `field` va primero porque es la capa a sangre sobre el
 * socket entero — la única candidata real a LCP — y el script le pone
 * `fetchpriority="high"` al índice 0. Coincide con `AURA_LAYERS[0]` por
 * construcción, no por coincidencia.
 */
export const AURA_PRELOADS: readonly {
  readonly srcSet: string;
  readonly sizes: string;
  readonly type?: string;
}[] = AURA_LAYERS.map((layer) =>
  layer.avif
    ? { srcSet: auraAvifSrcSet(layer), sizes: AURA_SIZES, type: "image/avif" }
    : {
        srcSet: `${layer.srcSmall} 1024w, ${layer.src} 1672w`,
        sizes: AURA_SIZES,
      },
);

/**
 * srcSet AVIF de una capa del aura (solo las que declaran avif: true en la
 * tabla -- ver ese campo para la guarda que decidio cuales). Cifras de la
 * codificacion (Pillow, q55 speed 2): field/handLeft/handRight ganan un
 * 33-54% con PSNR minimo 46,79 dB contra el WebP de referencia (maestros no
 * disponibles: transcodificacion declarada, misma procedencia que el ojo y
 * que Story). La precarga de esas capas pasa a la pista AVIF con
 * type="image/avif" -- tiene que pedir EXACTAMENTE lo que el <picture>
 * elegira o la capa se descarga dos veces; "energy" conserva su precarga
 * WebP sin type. Detalle en assets/hero-aura/manifest.json.
 */
export function auraAvifSrcSet(layer: AuraLayer): string {
  return `${layer.srcSmall.replace(/\.webp$/, ".avif")} 1024w, ${layer.src.replace(/\.webp$/, ".avif")} 1672w`;
}

/** Relación de aspecto del lienzo original de Aura (1672 × 941), igual que
 *  la del ojo: es el mismo tamaño de lienzo de origen. */
export const AURA_ASPECT = "1672 / 941";

/**
 * Color medio del campo pastel (`00-field.png`), convertido a OKLCH: es lo
 * que se ve en `ScAuraBase` un instante antes de que el WebP de la capa
 * `field` termine de decodificar (spec §3.5, §6.2.1, §15.5).
 *
 * Excepción de color sancionada, la misma que `EYE_SURFACE`: Aura es
 * `aria-hidden` y puramente decorativa, así que este literal no es un
 * `semantic.*` — un rol semántico cambiaría con el tema y esta composición
 * SOLO se monta en tema claro, por diseño (spec §7).
 */
export const AURA_SURFACE = "oklch(0.942 0.023 285)";

/** Posición del orbe DENTRO del marco del arte (medida, spec §15.5). */
export const AURA_ORB = { x: "50.92%", y: "41.73%" } as const;

/**
 * Eje X del hero al que se ancla el orbe (spec §3.4). El eje Y no tiene una
 * constante propia: lo fija la geometría del marco (`ScAuraSubject`, altura
 * exacta del hero, `top: 0`), que coincide numéricamente con `AURA_ORB.y`
 * (spec §3.6, reverificado por render en la revisión 2026-07-27, spec
 * §15.6).
 */
export const AURA_ANCHOR_X = "69.28%";

/** Lado del slot de `Sol`, como porcentaje del ancho del marco del sujeto.
 *  Valor CALCULADO a partir del render de `Sol`, no una medida directa del
 *  arte (ver el docblock de cabecera). */
export const AURA_ORB_SIZE = "28.3%";

/**
 * Profundidad de parallax del orbe (`Sol`). Sigue siendo la MÁS ALTA de la
 * composición — mayor que la de `energy` (0.15) — pero no porque la energía
 * esté ausente bajo el orbe: medido de nuevo sobre la capa nueva (spec
 * §15.4), la nebulosa SÍ tiene una presencia real ahí, modesta pero no nula
 * (alfa media 11.7/255 ≈ 4.6 % en r≤60px, subiendo a 18-20/255 ≈ 7-8 % hacia
 * r≤180-245px) — nada parecido al 0/255 que medía el lote anterior. La
 * conclusión no cambia: `Sol`, opaco y del tamaño del slot, sigue tapando
 * esa zona igual que antes, así que puede montarse como la capa más cercana
 * al espectador sin que esa presencia modesta de fondo le reste fidelidad.
 * `aura.layers.test.ts` lo ata a la tabla para que no puedan divergir, igual
 * que `eye.layers.test.ts` ata `EYE_MASCOT_DEPTH`.
 */
export const AURA_ORB_DEPTH = 0.8;

/**
 * Orden EXACTO del escalonado de entrada/salida que pide el encargo (tema
 * claro; revisión 2026-07-27, spec §1/§4.2): Sol primero, después las capas
 * de Aura en el orden en que el brief las enumera («las capas de Aura y las
 * manos»), las manos al final — `orb → field → energy → handLeft →
 * handRight`. El ÍNDICE de cada parte en este array ES el escalón del
 * stagger — `aura.parts.tsx` lo multiplica por `HERO_STEP_MS`
 * (`hero.transition.ts`) para calcular el `transition-delay` de cada capa,
 * y `HERO_STAGGER_STEPS`/`HERO_STACK_MS` se derivan de su longitud junto con
 * la de `EYE_STAGGER`.
 *
 * El orden ANTERIOR a esta revisión (`field → handLeft → handRight →
 * energy → orb`) obedecía a otro encargo, previo al brief citado arriba, que
 * no fijaba una lectura de "primero Sol". El de ahora lo fija el brief
 * literal, no una preferencia estética: Sol es la mascota central de la
 * composición clara —el equivalente del Wormhole en oscuro—, así que tiene
 * que ser el escalón 0 exactamente por el mismo motivo que `mascot` lo es en
 * `EYE_STAGGER` (ver su docblock en `eye.layers.ts`): con la fórmula de
 * retardo de salida en reverso (`(length - 1 - i) * HERO_STEP_MS`, que
 * `auraStagger()` ya implementa y no cambia), el escalón 0 recibe el
 * retardo MAYOR y es el último en apagarse — exactamente lo que exige el
 * brief («por último Sol»).
 *
 * Este array sigue vivo DESACOPLADO de `AURA_LAYERS` (orden de PINTADO,
 * reordenado también en esta misma revisión por un motivo distinto — spec
 * §15.3, ver el docblock de esa tabla): `auraStep()` en `aura.parts.tsx`
 * busca por nombre de `data-part`, no por posición en este array, así que
 * los dos órdenes pueden divergir sin que ninguno rompa al otro. De hecho
 * divergen: el orden de revelado antepone `field` a `energy`, mientras que
 * el orden de pintado tiene a `energy` justo detrás de `field` también —
 * coincidencia parcial, no un acoplamiento real; `aura.layers.test.ts` lo
 * verifica por conjunto (mismos `part` que `AURA_LAYERS` más `"orb"`, sin
 * importar el orden) precisamente para dejar constancia de que el ORDEN de
 * revelado es un dato distinto del de pintado.
 *
 * Vive aquí, junto a `AURA_LAYERS`, y no en `hero.transition.ts` (donde el
 * primer borrador de la spec lo dibujaba como `HERO_STAGGER`): el orden es
 * un dato de LA COMPOSICIÓN —la tabla de sus capas más el orbe—, no de la
 * coreografía temporal, así que su fuente natural es este archivo;
 * `hero.transition.ts` lo IMPORTA para derivar sus constantes de tiempo, en
 * vez de duplicar la lista y arriesgarse a que las dos copias diverjan.
 *
 * `"base"` (el rectángulo de `AURA_SURFACE` que se ve antes de que el WebP
 * de `field` termine de decodificar) NO aparece en este array: comparte
 * escalón con `"field"` por definición (spec §6.2.1, "el escalón son DOS
 * elementos con el mismo retardo") porque son el mismo instante visual, así
 * que quien busca el índice de `"base"` lo resuelve tratándolo como
 * sinónimo de `"field"` en vez de duplicar la entrada. Igual ocurre con
 * `"foot"` (el degradado violeta del pie), sinónimo de `"field"` sin cambios
 * respecto a la revisión anterior.
 */
export const AURA_STAGGER = [
  "orb",
  "field",
  "energy",
  "handLeft",
  "handRight",
] as const;
