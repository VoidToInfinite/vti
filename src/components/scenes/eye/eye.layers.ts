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

/**
 * Descriptores de precarga del arte oscuro, en el MISMO formato que emite el
 * `<img>` de `Eye.tsx`. Los consume el script de arranque del tema
 * (`buildThemeBootstrapScript`, `src/theme/resolveTheme.ts`), que es el único
 * punto del sitio que conoce el tema resuelto ANTES de hidratar.
 *
 * POR QUÉ VIVE AQUÍ y no en `layout.tsx` ni en `resolveTheme.ts`: el navegador
 * solo reconoce una precarga y la petición del `<img>` como la MISMA cosa si
 * `imagesrcset`/`imagesizes` coinciden con `srcSet`/`sizes` carácter a
 * carácter. Si divergen, la imagen se descarga dos veces y el arreglo sale más
 * caro que el defecto. Declarándolo junto a la tabla de capas que las dos
 * partes consumen, la única forma de que diverjan es que alguien cambie la
 * plantilla de `Eye.tsx` sin tocar ésta — y para eso está el candado de
 * `Eye.test.tsx`, que compara lo que el componente RENDERIZA de verdad contra
 * esta lista, no una constante contra otra.
 *
 * Ganancia medida contra el build de producción con estrangulamiento (4× CPU,
 * ~1,6 Mbps, 150 ms de latencia, contexto nuevo por corrida, mediana de 3, la
 * misma sesión para las dos ramas): **LCP oscuro 10.388 ms → 2.108 ms** y el
 * elemento LCP deja de ser una capa del ojo para pasar a ser texto. El tema
 * claro no cambia (2.252 → 2.212 ms, dentro del ruido): no se le inyecta nada.
 */
export const EYE_PRELOADS: readonly {
  readonly srcSet: string;
  readonly sizes: string;
}[] = EYE_LAYERS.map((layer) => ({
  srcSet: `${layer.srcSmall} 1024w, ${layer.src} 1672w`,
  sizes: EYE_SIZES,
}));

/** Relación de aspecto del lienzo original (1672 × 941). */
export const EYE_ASPECT = "1672 / 941";

/**
 * Negro del lienzo del ojo. Se exporta —en vez de repetir el literal— porque la
 * continuidad Hero → Story exige que el extremo superior de la costura sea
 * EXACTAMENTE el valor que pinta `ScSocket`: dos literales iguales en dos
 * archivos distintos se separan al primer retoque y la costura reaparece.
 *
 * Es la MISMA excepción de color sancionada que documenta `eye.parts.tsx`
 * (líneas 5-14): el ojo es `aria-hidden` y decorativo, su negro es identidad de
 * marca y no un rol semántico, así que no cambia con el tema.
 *
 * Vive en esta capa de datos, y no en `eye.parts.tsx`, porque ese módulo es
 * `"use client"` con styled-components: importar la constante desde aquí evita
 * arrastrar el árbol de estilos del ojo a quien solo necesita el color.
 */
export const EYE_SURFACE = "oklch(0 0 0)";

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

/**
 * Orden EXACTO del escalonado de aparición/desaparición del ojo (tema
 * oscuro) que pide el encargo (spec §1, §4.1): mascota → fondo → párpado →
 * nebulosa → iris → pupila. El ÍNDICE de cada pieza en este array ES su
 * escalón — tanto en la carga («como si se mostrase desde el fondo, como una
 * aparición») como en el cruce de temas, donde el retardo de salida se cuenta
 * en reverso contra esta misma longitud (`retardoSalida(i) = (length - 1 -
 * i) * HERO_STEP_MS`, la misma fórmula que ya usa `auraStagger()`). Con esa
 * fórmula, `mascot` (escalón 0) recibe el retardo MAYOR y es la última en
 * apagarse — exactamente lo que exige el brief («por último el Wormhole»).
 *
 * Dos sinónimos comparten escalón y NO ocupan entrada propia — cada uno es,
 * en su extremo del array, el MISMO instante visual que la pieza junto a la
 * que se lista, no una pieza adicional:
 * - `"socket"` ≡ `"mascot"` (escalón 0). El lienzo negro (`ScSocket`) es el
 *   vacío en el que aparece el Wormhole/Sol: tiene que estar presente
 *   EXACTAMENTE cuando la mascota lo está, y cerrarse con ella al salir —
 *   una mascota flotando sobre un pozo que llegara antes o se fuera después
 *   rompería la ilusión de que emerge DE ahí.
 * - `"scrim"` ≡ `"pupil"` (escalón 5, el último). El velo de contraste
 *   (`ScScrim`) existe únicamente para sostener la legibilidad de la copia
 *   del hero, que por diseño llega DESPUÉS de que todas las capas hayan
 *   terminado de asentarse (spec §5.2, `HERO_CHROME_OFFSET_MS`): revelarlo
 *   antes solo oscurecería un lienzo que ya es negro, sin ningún texto al
 *   que dar contraste todavía.
 *
 * Por qué vive AQUÍ y no en `hero.transition.ts`: mismo razonamiento que ya
 * documenta `AURA_STAGGER` en `aura.layers.ts` — el orden es un dato de ESTA
 * composición (qué capa va antes que cuál), mientras que `hero.transition.ts`
 * solo aporta los tiempos (duración de un fundido, paso entre escalones) que
 * se aplican por igual a cualquier orden. Duplicar el array en el módulo de
 * tiempos arriesgaría que las dos copias divergieran en el primer retoque;
 * importarlo desde allí (como ya hace con `AURA_STAGGER`) lo evita.
 *
 * Por qué el orden coincide con el de `EYE_LAYERS` (salvo por la mascota, que
 * no es una entrada de esa tabla): el brief pide que el ojo se muestre «desde
 * el fondo, como una aparición», y `EYE_LAYERS` YA está ordenado por
 * profundidad de atrás a delante (`background` en 0 hasta `pupil` en 0.85,
 * spec §7, ver el test "las capas van de atras a delante" en
 * `eye.layers.test.ts`). Reutilizar ese mismo orden para el escalonado es la
 * lectura literal del brief, no una elección adicional: el fondo revelándose
 * antes que el iris ES la aparición «desde el fondo». `eye.layers.test.ts`
 * ata los cinco últimos escalones de este array a `EYE_LAYERS.map(l =>
 * l.part)` para que no puedan divergir sin que el test lo note.
 */
export const EYE_STAGGER = [
  "mascot",
  "background",
  "eyelid",
  "nebula",
  "iris",
  "pupil",
] as const;
