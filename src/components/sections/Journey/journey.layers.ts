/**
 * Constantes de arte propias de la sección Journey (spec
 * `docs/superpowers/specs/2026-07-28-landing-v2-secciones-design.md` §7.2),
 * transcritas VERBATIM del mockup aprobado
 * `C:\Users\Daniel\Downloads\Landing v2.dc.html` líneas 103-155 (D10: estos
 * colores/geometría no entran en los tokens semánticos — `system.test.ts` no
 * se toca).
 *
 * Lo que SÍ usa tokens del tema (D11) vive directamente en `Journey.tsx`:
 * espaciado (`theme.data.space`), radios (`theme.data.radius`), breakpoints
 * y — para el color de cada disco/etiqueta de paso — la rampa de color ya
 * existente (`theme.data.palette.<hue>[<paso>]`), porque el mockup referencia
 * esos mismos nombres (`var(--primary-500)`, `var(--secondary-600)`, etc.):
 * son el mismo sistema de tokens, no un color inventado aparte. Solo lo que
 * el sistema de tokens NO modela (el degradado pastel de la tarjeta, el
 * borde/sombra de los discos, el trazo del path punteado, el degradado de la
 * cita y la sombra de la figura) se congela aquí como literal.
 */
import { DECK } from "@/motion/vocabulary";
import { grid } from "@/theme/tokens/grid";
import { type as typeTokens } from "@/theme/tokens/type";

export type JourneyStepId =
  "discover" | "learn" | "imagine" | "create" | "share" | "evolve";

export interface JourneyStep {
  readonly id: JourneyStepId;
  /**
   * Desplazamiento vertical (`transform: translateY`) del paso en el grid de
   * 6 columnas, mockup L114-143. Solo se aplica ≥ `lg` (spec §7.2: "< lg...
   * sin offsets"); por debajo el layout es un grid simple sin transform.
   */
  readonly offsetY: number;
  /** Rampa de color del tema (mockup: `var(--<ramp>-<paso>)`) para el icono
   *  y la etiqueta de este paso. (Hasta la crítica externa #11, 2026-08-18,
   *  esa etiqueta se rotulaba `0N · Label` en la rama clara; el ordinal
   *  VISIBLE se retiró al unificar el contenido de las dos ramas -- ver el
   *  docblock de cabecera de `Journey.tsx`.) */
  readonly colorRamp: "primary" | "secondary" | "error";
  readonly colorStep: 500 | 600 | 700;
  /** `box-shadow` VERBATIM del disco (mockup, un valor por paso — no siguen
   *  una única fórmula, así que se listan literales en vez de derivarlos). */
  readonly discShadow: string;
}

/**
 * Orden y geometría EXACTOS del mockup (L114-143): el índice es la POSICIÓN
 * del paso -- la que anuncia el texto para lector de pantalla ("Paso N de 6",
 * las dos ramas desde la crítica externa #11, 2026-08-18) -- y también el
 * escalón del stagger de reveal (`Journey.tsx` multiplica el índice por el
 * paso de ~90ms, mismo mecanismo que `ScItem` en `Features.tsx`). La posición
 * NO se duplica como campo de esta tabla, a propósito: es el orden del array,
 * no un dato propio del paso.
 */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    id: "discover",
    offsetY: 0,
    colorRamp: "primary",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.6 0.12 260 / 0.14)",
  },
  {
    id: "learn",
    offsetY: 26,
    colorRamp: "primary",
    colorStep: 600,
    discShadow: "0 8px 20px oklch(0.6 0.12 260 / 0.14)",
  },
  {
    id: "imagine",
    offsetY: 6,
    colorRamp: "secondary",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.6 0.15 290 / 0.14)",
  },
  {
    id: "create",
    offsetY: 30,
    colorRamp: "secondary",
    colorStep: 600,
    discShadow: "0 8px 20px oklch(0.6 0.15 290 / 0.14)",
  },
  {
    id: "share",
    offsetY: 2,
    colorRamp: "secondary",
    colorStep: 700,
    discShadow: "0 8px 20px oklch(0.55 0.2 300 / 0.14)",
  },
  {
    id: "evolve",
    offsetY: 24,
    colorRamp: "error",
    colorStep: 500,
    discShadow: "0 8px 20px oklch(0.66 0.24 12 / 0.14)",
  },
] as const;

/** Fondo pastel de la tarjeta, VERBATIM del mockup (línea 104). */
export const JOURNEY_CARD_BACKGROUND =
  "linear-gradient(135deg, #FFEBFDEB, #E3F6FFEB)";

/*
 * AQUI VIVIO JOURNEY_DISC_BORDER, el borde de los 6 discos (mockup L115
 * etc.). Retirado en Task 12 (dieta de ornamento B, 2026-08-09, ghost-card):
 * `ScDisc` (Journey.tsx) se queda solo con su sombra-glow (`discShadow`,
 * arriba en este fichero) -- la regla de la casa es borde O sombra, nunca
 * los dos (impeccable); ver el docblock de `ScDisc`, Journey.tsx, para el
 * porque de este lado.
 */

/**
 * Path punteado detrás de los pasos (mockup L112), solo ≥ `lg` (spec §7.2).
 * `viewBox`/`d`/trazo copiados verbatim; el propio `<svg>` no lleva
 * `<defs>`/gradiente/patrón (a diferencia de las tarjetas de Features), así
 * que no necesita un id propio.
 */
export const JOURNEY_PATH_VIEWBOX = "0 0 760 96";
export const JOURNEY_PATH_D =
  "M63,28 C105,28 148,54 190,54 S275,34 317,34 S402,58 444,58 S529,30 571,30 S656,52 698,52";
export const JOURNEY_PATH_STROKE = "oklch(0.72 0.1 290 / 0.45)";

/*
 * AQUI VIVIERON JOURNEY_QUOTE_GRADIENT_LIGHT/_DARK, el degradado de texto de
 * la cita final (mockup L145). Retirados en Task 12 (dieta de ornamento B,
 * auditoria premium 2026-08-08, 2026-08-09): `ScQuoteText` (Journey.tsx) pasa
 * a color solido (`semantic.brandText`, el mismo rol que ya usaba como
 * fallback de `@supports not (background-clip: text)`) para poder medir su
 * contraste con `contrast.ts`. Medicion completa en el docblock de
 * `ScQuoteText`, Journey.tsx, y en Journey.test.tsx, describe "Task 12".
 */

/** `filter: drop-shadow(...)` de la figura (mockup L154). */
export const JOURNEY_FIGURE_SHADOW =
  "drop-shadow(0 16px 34px oklch(0.55 0.15 285 / 0.22))";

/**
 * Ancho reservado para la figura (mockup L154: `width: 305px`), tanto para
 * el `padding-inline-end` que reserva su hueco (`ScBody` en `Journey.tsx`)
 * como para el ancho de su caja de `object-fit: contain`.
 *
 * REVISADO 2026-07-28 (fix de solape con el camino punteado): el mockup
 * posiciona la figura con coordenadas absolutas (`top`/`left`) medidas
 * contra SU propio lienzo estático; portadas literalmente a un layout con
 * contenido real (traducciones de distinto largo, alto de tarjeta
 * variable) la figura acababa montada sobre el camino/rejilla de pasos en
 * cuanto el contenido no coincidía exactamente con el mockup. Se sustituyen
 * `top`/`right`/`height` por un layout que reserva el hueco por
 * construcción (`ScBody`/`ScFigure` en `Journey.tsx`, `inset-block: 0` +
 * `height: 100%` + `object-fit: contain`): la figura entra siempre completa
 * y nunca se superpone al camino, sea cual sea la altura real de la
 * columna. Solo el ANCHO sigue siendo un literal del mockup.
 */
export const JOURNEY_FIGURE_WIDTH = "240px";
export const JOURNEY_FIGURE_SIZES = "305px";

/*
 * Intercambio deliberado 2026-07-28 (edición manual del usuario, en los dos
 * lados a la vez: Story.tsx pasa a usar journey-presenting-*): Journey usa
 * el fichero que originalmente se generó para Story, y Story el que se
 * generó para Journey. El intercambio de IMÁGENES se conserva: es una
 * decisión de composición del dueño, no un error.
 *
 * RESUELTO 2026-09-01 (decisión del dueño: reescribir los dos textos
 * alternativos desde cero, mirando cada imagen). Durante cinco semanas el alt
 * de i18n describió la figura de la sección contraria — aquí prometía "el
 * viaje con la palma abierta" sobre una imagen de una figura con el índice
 * levantado. Hoy `Home.journey.figureAlt` dice "señalando hacia arriba con
 * el índice" y `Home.story.figureAlt` dice "ofreciendo la palma abierta",
 * que es lo que cada fichero contiene de verdad.
 *
 * El texto alternativo es CONTENIDO, no geometría de layout: si algún día se
 * vuelve a mover un fichero de sección, el alt viaja con la imagen, no con
 * la sección. Un cambio de `JOURNEY_FIGURE_SRC` sin tocar
 * `Home.journey.figureAlt` vuelve a mentirle al lector de pantalla.
 */
export const JOURNEY_FIGURE_SRC = "/figures/story-pointing-1024.webp";
export const JOURNEY_FIGURE_SRC_SMALL = "/figures/story-pointing-640.webp";

/**
 * Amplitud del desplazamiento de scroll (D1, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`) de
 * la figura y del camino punteado en tema CLARO, ligado a
 * `--journey-progress` -- el termino de TRAVESIA que publica
 * `useSectionProgress` sobre `ScJourney` (0 al asomar la seccion por el
 * borde inferior del viewport, 1 al abandonarla por arriba).
 *
 * A diferencia de Story (`STORY_FIGURE_SCROLL_SHIFT`), aqui el `transform`
 * va DIRECTO en `ScFigure`/`ScPath` (Journey.tsx), sin envoltorio: ninguno
 * de los dos anima ya `transform` con `@keyframes` (la rama clara de Journey
 * nunca tuvo flotacion, a diferencia de la figura/tarjeta de Story), asi que
 * no hay ninguna propiedad que disputarle a una animacion existente -- ver
 * el docblock de `STORY_FIGURE_SCROLL_SHIFT` (`story.layers.ts`) para el
 * caso en el que SI hace falta el envoltorio.
 *
 * Sentidos OPUESTOS a proposito (figura hacia arriba, camino hacia abajo):
 * dos "planos" decorativos de la misma composicion; moverse en direcciones
 * distintas -- no solo a velocidades distintas -- es lo que se lee como
 * profundidad (D1 del encargo). Magnitud en decenas de pixeles, no cientos.
 */
export const JOURNEY_FIGURE_SCROLL_SHIFT = "-30px";
export const JOURNEY_PATH_SCROLL_SHIFT = "16px";

/**
 * Tope de ancho del CONTENIDO de la rama oscura (D8, spec
 * `2026-08-02-journey-overlay-transition-design.md`). El 1280px del
 * encargo del usuario describe ahora el CONTENIDO (`ScDarkContent`,
 * `Journey.tsx`), no la escena: la escena (`JourneyCosmicPortal`) pasa a
 * sangre en esa misma entrega (D7) y pierde su propio tope de ancho
 * (`JOURNEY_PORTAL_MAX_WIDTH`, eliminada de
 * `journeyCosmicPortal.layers.ts`). Es una constante PROPIA y no una
 * reutilización de la anterior porque, aunque el número coincide, el sujeto
 * cambió: reutilizar `JOURNEY_PORTAL_MAX_WIDTH` para el contenido escondería
 * ese cambio de sujeto detrás de un nombre que ya no describe lo que acota.
 *
 * DESDE LA CRÍTICA EXTERNA #12 (2026-08-19) EL NÚMERO NO VIVE AQUÍ: deriva de
 * `grid.sectionMax`, el token que nombra el ancho de contenido de las
 * secciones que componen a sangre completa. El valor resultante es EXACTAMENTE
 * el mismo (1280px) — nombrar una medida repetida es refactor de vocabulario,
 * no rediseño —, así que el CSS renderizado no cambia ni un carácter. Lo que
 * cambia es que este fichero deja de ser una de las cuatro copias del mismo
 * número (regla 13 de `RULES.md`).
 *
 * La constante NO se retira en favor de leer el token directamente desde
 * `journey.deck.tsx`: sigue siendo el nombre con el que ESTA sección se
 * refiere a su propio tope de contenido, y conservarla deja el día de mañana
 * abierto a que Journey diverja del resto sin tocar a nadie más. Mismo patrón,
 * mismas palabras y misma ola que `FEATURES_CONTENT_MAX_WIDTH`
 * (`features.layers.ts`), `CONTACT_CONTENT_MAX_WIDTH` (`contact.layers.ts`) y
 * `STORY_DARK_MAX_WIDTH` (`story.layers.ts`). El candado de que el número no
 * vuelva a escribirse a mano se observa en la FUENTE (`Journey.test.tsx`),
 * porque token y literal resuelven a la misma cadena y ningún candado de valor
 * puede distinguirlos (`task/lessons.md`, 2026-08-12).
 */
export const JOURNEY_CONTENT_MAX_WIDTH = grid.sectionMax;

/**
 * Cuánto sube Journey por encima de Story al superponerse (D2/D5, spec
 * `2026-08-02-journey-overlay-transition-design.md`): una pantalla completa,
 * aplicada como `margin-block-start` NEGATIVO sobre la rama oscura de
 * `ScJourney` (`Journey.tsx`). DEBE valer EXACTAMENTE lo mismo que
 * `STORY_DARK_HEIGHT * STORY_DECK_TAIL_SCREENS` (`story.layers.ts`): si el
 * solape es MENOR que la zona de hold de Story, asoma una banda de la
 * escena de Story sin tapar entre las dos secciones; si es MAYOR, Journey
 * empieza a subir con la diapositiva 6 todavía viva (tapándola antes de que
 * termine su tramo de scroll). Las dos constantes viven en ficheros de
 * datos de secciones distintas a propósito — importar una desde la otra
 * acoplaría los datos de Story y Journey, que no se conocen entre sí — así
 * que la igualdad no se declara aquí en prosa: la comprueba un test
 * (`Journey.test.tsx`, invariante D5) que importa las dos.
 */
export const JOURNEY_OVERLAY_RISE = "100dvh";

/*
 * Constantes de la presentación de 8 diapositivas de Journey (D3/D8/D9/D10/
 * D11, spec `2026-08-02-journey-deck-8-diapositivas-design.md`). Mismo
 * criterio que las de `story.layers.ts`: viven aquí y no en el componente
 * porque el hook `useSlideDeck` (`JOURNEY_SLIDES`) y el propio deck
 * estructural (`journey.deck.tsx`) las necesitan sin conocerse entre sí.
 */

/**
 * Alto de UNA diapositiva de la presentación oscura, a pantalla completa
 * (D8): mismo nombre y mismo rol que `STORY_DARK_HEIGHT` (`story.layers.ts`),
 * pero vive aquí y no en `journeyCosmicPortal.layers.ts` -- la medida no
 * cambia (`100dvh`, ya era lo que pedía el encargo: "el alto de la vista del
 * dispositivo"), lo que cambia es el SUJETO. `JOURNEY_PORTAL_HEIGHT` nunca
 * describió la escena de fondo, describía la caja de la SECCIÓN, y solo
 * vivía en el fichero de la escena por herencia de una entrega anterior. Con
 * la presentación de diapositivas, además, pasa a ser literalmente el alto
 * del `stage` pegado (`ScJourneyStage`, `journey.deck.tsx`) -- un papel que
 * el fichero de la escena no tiene por qué conocer.
 */
export const JOURNEY_DARK_HEIGHT = "100dvh";

/**
 * Número de diapositivas de la presentación: se DERIVA de `JOURNEY_STEPS`
 * (1 intro + un paso por cada entrada de la tabla + 1 cita de cierre), nunca
 * un literal escrito a mano (D3). Es la misma cicatriz que ya dejó este
 * mismo directorio (`task/lessons.md`, 2026-08-01): un recuento duplicado
 * deja de proteger en silencio en cuanto la fuente que describe cambia -- y
 * aquí la fuente (`JOURNEY_STEPS`) ya varió una vez en la vida de esta
 * sección. Hoy vale 8 (1 + 6 + 1), pero el número concreto no es lo que
 * importa: si mañana se añade o se quita un paso, esta constante -- y con
 * ella la pista, el rail y el reparto de `Journey.tsx` -- se recalculan
 * solos.
 */
export const JOURNEY_SLIDES = JOURNEY_STEPS.length + 2;

/**
 * Zona de "hold" al final de la pista (D3/D4/D5, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`), en pantallas:
 * el tramo final durante el cual el `stage` sigue pegado
 * (`position: sticky`), la presentación ya ha terminado de recorrer sus
 * diapositivas y lo ÚNICO que ocurre en ese tramo es que la sección Features
 * sube por encima superponiéndose (D2 de esa misma spec). Sin esta zona el
 * solape de Features se comería el recorrido de la última diapositiva:
 * Features empezaría a taparla mientras todavía está activa.
 *
 * Tiene que valer EXACTAMENTE lo mismo que `FEATURES_OVERLAY_RISE`
 * (`src/components/sections/Features/features.layers.ts`), medido en
 * pantallas: si el hold es más corto que el solape, queda una banda de la
 * escena de Journey sin tapar entre las dos secciones; si es más largo,
 * Features empieza a subir con la cita de cierre todavía viva. Las dos
 * constantes viven en ficheros de datos distintos (acoplarlas importando una
 * desde la otra mezclaría los datos de dos secciones que no se conocen entre
 * sí), así que la igualdad NO se declara aquí en prosa: la ata un test que
 * importa los dos ficheros (`Features.test.tsx`, invariante D5).
 *
 * Precedente exacto: `STORY_DECK_TAIL_SCREENS` (`story.layers.ts`), la misma
 * zona de hold que hoy sostiene la superposición de Journey sobre Story.
 *
 * ---
 *
 * POR QUÉ EL VALOR ES 1 Y NO SE PUEDE RECORTAR DESDE AQUÍ (crítica externa
 * #10, hallazgo A, 2026-08-18). La crítica midió, a 1440×900 en tema oscuro,
 * «un tramo muerto de ~1.250 px al final del deck»: entre `scrollY` 12.150 y
 * 13.400 la cita de cierre se queda clavada con el DOM de `#journey`
 * idéntico. La medición es correcta; la conclusión de que sobra pista, no.
 * Queda escrito aquí para que la próxima ola no vuelva a intentar recortar la
 * cola sin ver las dos condiciones que la fijan.
 *
 * Sea `S` = `JOURNEY_SLIDES` (8), `T` = esta constante, `R` =
 * `FEATURES_OVERLAY_RISE` en pantallas, `p` = una pantalla, `A` = el inicio
 * de la pista en el documento. Con `track = (S + T)·p`:
 *
 *   span (el recorrido que reparte `useSlideDeck`) = (S + T)·p − p − T·p
 *                                                  = (S − 1)·p
 *   `progress` llega a 1 en          A + (S − 1)·p
 *   el stage se despega en           A + (S + T − 1)·p
 *   Features empieza a cubrir en     A + (S + T − R − 1)·p
 *   Features cubre del todo en       A + (S + T − R)·p
 *
 * Dos costuras que tienen que cerrar a la vez:
 *   (1) Features NO puede empezar a tapar la cita antes de que el deck
 *       termine  ⟹  S + T − R − 1 = S − 1  ⟹  **T = R**
 *   (2) el stage no puede despegarse antes de que Features cubra del todo, o
 *       una banda de la escena de Journey sube destapada
 *              ⟹  S + T − 1 = S + T − R  ⟹  **R = 1**, y con (1), **T = 1**
 *
 * `T = 1` no es un número elegido: es la única solución del sistema. Bajarlo
 * exige bajar `FEATURES_OVERLAY_RISE` a la vez — otra sección, otro fichero —
 * y aun así (2) obliga a que sigan siendo iguales, así que el recorte no sale
 * gratis en ninguna de las dos.
 *
 * QUÉ ES DE VERDAD ESE TRAMO, con las cifras del propio modelo (que reproduce
 * el 12.150 medido al píxel, así que describe la página real):
 *
 *   12.150 → 12.600 (450 px, = 0,5 pantallas)
 *       la cita ya es la diapositiva activa y `progress` sube de 0,9286 a 1.
 *       Es media ventana de índice: `useSlideDeck` redondea, así que la
 *       primera y la última diapositiva se llevan media ventana cada una.
 *       NO es desperdicio — es la ÚNICA franja en la que la cita se lee sin
 *       Features encima. Recortarla dejaría el cierre de la sección sin un
 *       solo píxel de lectura limpia.
 *   12.600 → 13.500 (900 px, = T)
 *       Features sube y va cubriendo. Aquí el DOM de `#journey` sí es
 *       idéntico frame a frame — que es exactamente lo que la crítica midió —
 *       pero la pantalla no está quieta: lo que se mueve es la sección
 *       siguiente, que la sonda no observaba.
 *
 * Y el segundo síntoma del mismo hallazgo («entre 14.150 y 14.400 no se
 * renderiza nada») cae FUERA de esta sección: la pista de Journey acaba en
 * 14.400 y Features empieza en 13.500, así que ese tramo es el final de
 * `ScDarkFrame` y el principio de `ScDarkTail` (`Features.tsx`) — la zona de
 * hold que Features reserva a propósito para que Contacto suba sobre ella.
 * Se declara, no se toca: es otra sección.
 */
export const JOURNEY_DECK_TAIL_SCREENS = 1;

/**
 * Alto total de la pista que da recorrido de scroll a la presentación: suma
 * `JOURNEY_DECK_TAIL_SCREENS` (D3, spec
 * `2026-08-02-features-overlay-celestial-orbital-design.md`), que
 * REVIERTE A PROPÓSITO D9 de la spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`. Aquella decisión
 * escribió, literalmente, que la pista de Journey no lleva cola porque
 * "nada tiene que superponerse a Journey -- Features, la sección siguiente,
 * no lo pide". El encargo de esta entrega es exactamente que Features SÍ lo
 * pida: sin la cola, Features empezaría a tapar con la diapositiva 8
 * (la cita) todavía activa, y esta no llegaría nunca a verse sin tapar. No es
 * un olvido de aquel razonamiento -- era correcto en su momento, para el
 * encargo de aquel momento -- sino una decisión nueva que lo sustituye
 * porque el encargo cambió. Un test la compara contra esta fórmula exacta
 * (no contra un número), para que la presencia de la cola se lea como una
 * decisión tomada y no como un accidente.
 */
export const JOURNEY_DECK_TRACK_HEIGHT = `calc((${JOURNEY_SLIDES} + ${JOURNEY_DECK_TAIL_SCREENS}) * ${JOURNEY_DARK_HEIGHT})`;

/**
 * Tramo FINAL de `--journey-progress` durante el cual la cita de cierre se
 * desvanece, en unidades de esa misma variable (0..1). Lo consume
 * `ScJourneyQuote` (`journey.deck.tsx`) como pendiente de una rampa de
 * `opacity`; ver su docblock para la declaración CSS exacta y para el guard de
 * `prefers-reduced-motion`, que aquí es obligatorio y no decorativo.
 *
 * ## El defecto que cierra (crítica externa #15, hallazgo A P2-1, 2026-09-02)
 *
 * Medido en tema oscuro a 1440×900, `scrollY` ≈ 13.100: «El destino no es el
 * infinito. El viaje lo es.» se leía solo como «El destino no», cortada por una
 * costura horizontal dura a media pantalla mientras el panel de Features subía
 * como cortina por debajo. A 12.600 la misma cita se leía entera.
 *
 * ## La secuencia real, derivada del código y no de la captura
 *
 * Con `A` = inicio de la pista en el documento, `p` = una pantalla, `S` =
 * `JOURNEY_SLIDES` (8), `T` = `JOURNEY_DECK_TAIL_SCREENS` (1) y `R` =
 * `FEATURES_OVERLAY_RISE` en pantallas (1) — las tres constantes atadas entre
 * sí por la aritmética del docblock de `JOURNEY_DECK_TAIL_SCREENS`, más
 * arriba, y por el test de invariante que importa los dos ficheros:
 *
 *   span de `useSlideDeck`      = (S − 1)·p = 7 pantallas
 *   la cita pasa a `current` en  A + ((S − 1.5)/(S − 1))·span = A + 6,5·p
 *   `progress` llega a 1 en      A + 7·p
 *   Features empieza a cubrir en A + (S + T − R − 1)·p = A + 7·p   <- el MISMO
 *   Features cubre del todo en   A + 8·p
 *
 * Es decir: la cita y la cortina no se solapaban por un desajuste de tiempos
 * que hubiera que corregir — se solapaban PORQUE `progress = 1` y «Features
 * empieza a cubrir» son, por construcción, el mismo instante. Con las cifras
 * de 1440×900 (p = 900, A = 6.300): `current` en 12.150, `progress = 1` y
 * comienzo de la cortina en 12.600, cobertura completa en 13.500. Los 13.100
 * de la captura caen justo en la mitad de esa cortina, que es exactamente
 * donde la costura cruza la caja de la cita.
 *
 * ## Por qué la salida es un desvanecido y no mover la cortina
 *
 * Las otras dos vías que el hallazgo plantea no son gratis, y conviene dejar
 * escrito por qué se descartan:
 *
 * - **Retrasar la cortina** (subir `T` por encima de `R`) funciona
 *   estructuralmente, pero regala otra pantalla de pista en la que no ocurre
 *   nada — justo el «tramo muerto de ~1.250 px» que la crítica #10 ya midió al
 *   final de este deck. Y no cierra el hallazgo: la cita seguiría en pantalla
 *   cuando la cortina arrancase, una pantalla más tarde, y volvería a cortarse
 *   igual.
 * - **Soltar el sticky antes** rompe la segunda costura del sistema (`R = 1`):
 *   asomaría una banda de la escena de Journey sin tapar entre las dos
 *   secciones.
 *
 * Queda el desvanecido, que es la primera opción del propio hallazgo: la cita
 * termina su turno ANTES de que llegue la cortina, así que la cortina cruza una
 * escena vacía y no una frase a medias. No hace falta ninguna señal de scroll
 * nueva — `--journey-progress` ya vale exactamente 1 en el instante en que la
 * cortina arranca, así que la rampa se ancla a ese 1 y termina justo ahí.
 *
 * ## De dónde sale el número, que no es un número elegido
 *
 * La cita es la diapositiva activa mientras `progress` cae en la última media
 * ventana de índice, `0,5 / (S − 1)` de ancho (`useSlideDeck` redondea; ver su
 * docblock de `scrollToSlide`). Este valor reparte ESA ventana, no el recorrido
 * entero: el 40 % final se va en el desvanecido y el 60 % inicial se queda para
 * leer. A 1440×900 son 270 px de lectura limpia y 180 px de salida. Se deriva
 * de `JOURNEY_SLIDES` y no de un literal, igual que la propia
 * `JOURNEY_DECK_TRACK_HEIGHT`: si el viaje gana o pierde un paso, la ventana se
 * recalcula sola (regla 39 de `RULES.md`).
 *
 * Se redondea a cuatro decimales porque el valor viaja a CSS como divisor de un
 * `calc()` y `0,02857142857142857` no aporta ni un píxel sobre `0,0286`.
 */
export const JOURNEY_QUOTE_EXIT_SPAN = Number(
  ((0.5 / (JOURNEY_SLIDES - 1)) * 0.4).toFixed(4),
);

/**
 * La rampa de `opacity` de la cita de cierre, ya como valor CSS listo para
 * consumir (`ScJourneyQuote`, `journey.deck.tsx`). Vale 1 mientras queda mas de
 * `JOURNEY_QUOTE_EXIT_SPAN` de recorrido por delante y baja a 0 al llegar a
 * `--journey-progress: 1` -- el instante exacto en que arranca la cortina de
 * Features; ver el docblock de la constante de arriba para la secuencia
 * completa.
 *
 * VIVE AQUI Y NO EN EL TEMPLATE del styled por el mismo criterio que
 * `JOURNEY_DECK_TRACK_HEIGHT`, unas lineas mas arriba: una expresion CSS
 * derivada de constantes de esta seccion es un DATO de la seccion. Y trae una
 * ventaja concreta: el valor entra en la hoja como UNA sola linea. Escrito
 * dentro del template, Prettier lo parte en cuatro (pasa de 80 columnas) y el
 * CSSOM conserva esos saltos dentro del valor, de modo que cualquier candado
 * que recorra la regla linea a linea solo veria `opacity: clamp(` -- medido en
 * esta misma tarea antes de mover la constante aqui.
 *
 * El `0` por defecto del `var()` no es decorativo: sin JS, o antes del primer
 * frame del hook, la rampa resuelve a 1 y la cita se pinta OPACA. Un defecto de
 * `1` la habria dejado invisible en ese mismo caso.
 */
export const JOURNEY_QUOTE_EXIT_OPACITY = `clamp(0, calc((1 - var(--journey-progress, 0)) / ${JOURNEY_QUOTE_EXIT_SPAN}), 1)`;

/**
 * Desplazamiento vertical de entrada/salida de cada diapositiva
 * (`data-state="past"`/`"next"`, `ScJourneySlide`). Mismo valor y mismo
 * criterio que `STORY_SLIDE_SHIFT`: lo bastante pequeño para leerse como un
 * paso dentro de la misma composición, no como un salto de layout. Se anima
 * siempre junto a `opacity`, nunca sobre una propiedad que dispare reflow
 * (regla de la casa: solo `transform`/`opacity`).
 *
 * Deriva de `DECK.slideShift` (fix wave D, hallazgo D2, 2026-08-12): hasta
 * esta revisión declaraba el literal `"40px"` a mano, DUPLICADO byte a byte
 * en `STORY_SLIDE_SHIFT` (`story.layers.ts`). Mismo valor exacto, cero
 * cambio visual; ver el docblock de `DECK` en `src/motion/vocabulary.ts`
 * para el detalle completo.
 */
export const JOURNEY_SLIDE_SHIFT = DECK.slideShift;

/**
 * Recorrido, en `transform`, del envoltorio de la escena de fondo
 * (`ScJourneySceneWrap`, `journey.deck.tsx`) a lo largo de
 * `--journey-progress`. Mismo problema y misma solución que
 * `STORY_SCENE_DEPTH_SHIFT`: con el `stage` pegado por `position: sticky`,
 * el `rect.top` de `JourneyCosmicPortal` se queda en ~0 durante todo el pase
 * de diapositivas, así que el término de scroll que calcula
 * `useSceneParallax` deja de aportar profundidad -- comportamiento correcto
 * del hook compartido, no un defecto a compensar tocándolo (lo usan también
 * Story/Features/Contact). Este envoltorio devuelve esa sensación de
 * profundidad con un `transform` propio. La unidad es `dvh`, igual que en
 * Story y por el mismo motivo exacto: un `%` en `translateY` se resuelve
 * contra el alto del PROPIO elemento, mientras que el mismo `%` en
 * `top`/`bottom` se resuelve contra el del CONTENEDOR -- con el envoltorio
 * sobredimensionado (`ScJourneySceneWrap`) esas dos alturas dejan de
 * coincidir, y de ahí salía exactamente el defecto que Story ya pagó una vez
 * (una banda de fondo asomando por arriba al scrollear). `dvh` es la misma
 * referencia en los dos sitios y cierra esa clase de fallo antes de que
 * vuelva a aparecer aquí.
 *
 * Deriva de `DECK.sceneDepthShift` (fix wave D, hallazgo D2, 2026-08-12):
 * hasta esta revisión declaraba el literal `"6dvh"` a mano, DUPLICADO byte a
 * byte en `STORY_SCENE_DEPTH_SHIFT` (`story.layers.ts`). Mismo valor exacto,
 * cero cambio visual; ver el docblock de `DECK` en
 * `src/motion/vocabulary.ts` para el detalle completo.
 */
export const JOURNEY_SCENE_DEPTH_SHIFT = DECK.sceneDepthShift;

/*
 * Escala tipográfica de cartel de la presentación oscura (D10/D11, spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`; T2/T3/T5/T6/T7, spec
 * `2026-08-02-journey-deck-tipografia-design.md`). Constantes PROPIAS, no
 * importadas de `story.layers.ts`: acoplar las dos escalas haría que
 * retocar el cartel de una sección moviera el de la otra. Sigue siendo cierto
 * tras las críticas externas #11 (2026-08-18) y #14 (2026-09-02):
 * `JOURNEY_DECK_TITLE_SIZE` deriva de un TOKEN del sistema
 * (`type.scale.h2`), no de la constante de Story -- ninguna de las dos
 * secciones importa nada de la otra, que es lo que este párrafo protege.
 *
 * De los tamaños que quedan, el ÚNICO calibrado contra el texto REAL de esta
 * sección es la etiqueta de paso (una sola palabra, tope 11rem). Los otros
 * dos derivan hoy de peldaños del SISTEMA, los dos desde la crítica externa
 * #14 (2026-09-02, hallazgo P3): el subtítulo de paso —60-80 caracteres, el
 * mismo rol de lectura que el cuerpo de pilar de Story— de
 * `type.scale.deckBody`, y la cita de cierre —tamaño y peso— de
 * `type.scale.deckClosing`. Esa cita ya coincidía con la nota de cierre de
 * Story desde T6/T7 (la spec de tipografía REVIRTIÓ a propósito el 3.5rem de
 * D10 para igualarla), pero lo hacía repitiendo el literal; el porqué de que
 * la coincidencia pasara de "casualidad declarada" a "peldaño compartido"
 * vive en el docblock de cada constante, más abajo, no aquí.
 */

/**
 * `h2#journey-title` de la diapositiva de intro. Es el `h2` del sistema, sin
 * tamaño propio: `type.scale.h2.size` (2rem = 32px), el mismo rango que ya
 * pintaban Features y Contact en las DOS ramas de tema y que Journey y Story
 * pintaban solo en la clara. Mismo rol y mismo valor que
 * `STORY_DECK_TITLE_SIZE`, ahora porque los dos leen el MISMO peldaño de la
 * escala, no porque dos ficheros repitan el mismo `clamp()`.
 *
 * TUVO TAMAÑO PROPIO HASTA LA CRÍTICA EXTERNA #14 (2026-09-02, decisión D4
 * del dueño: «un solo h2 dentro del oscuro»). Hasta la #11 (2026-08-18)
 * declaraba el literal `clamp(2rem, 6vw, 4rem)`, que aquella crítica tokenizó
 * como `type.scale.deckTitle` al encontrarlo escrito byte a byte también en
 * `STORY_DECK_TITLE_SIZE`; la #14 midió a 1440x900 que ese peldaño pintaba el
 * `<h2>` de Journey y de Story a 64px en oscuro mientras Features y Contact
 * pintaban el suyo a 32px en la misma página y el mismo tema -- el mismo
 * rango semántico a dos tamaños --, y el dueño decidió bajar estas dos. Con
 * el tamaño igualado, `deckTitle` pasó a ser un duplicado exacto de `h2` y se
 * retiró; su docblock de despedida vive en el hueco que dejó dentro de
 * `type.scale` (`src/theme/tokens/type.ts`).
 *
 * ESTO SÍ CAMBIA LO RENDERIZADO, al revés que la migración de la #11: por
 * encima de ~533px de viewport (donde `6vw` superaba las 2rem) el titular
 * pasa de hasta 64px a 32px fijos. Por debajo de ese ancho no cambia nada --
 * el mínimo del `clamp()` retirado ya era 2rem. El párrafo de cabecera de
 * este bloque sigue valiendo: las constantes de Journey no importan nada de
 * `story.layers.ts`; lo que comparten las dos secciones lo comparten a través
 * de la escala del sistema.
 */
export const JOURNEY_DECK_TITLE_SIZE = typeTokens.scale.h2.size;

/**
 * Etiqueta de una sola palabra de cada paso ("Descubre".."Evoluciona"),
 * elevada a escala de CARTEL (T2, spec
 * `2026-08-02-journey-deck-tipografia-design.md`): pasa de un tramo
 * comparable al título de un pilar de Story (tope 3rem) a ser el elemento
 * DOMINANTE de su diapositiva (tope 11rem, valor literal del encargo).
 *
 * Medido, no supuesto: el tope de 11rem solo se alcanza a partir de ~1760px
 * de viewport, porque `10vw = 11rem` justo ahí (10% de 1760px = 176px =
 * 11rem a 16px/rem); por debajo de ese ancho manda el término `10vw`, no el
 * tope. Con el deck acotado a `JOURNEY_CONTENT_MAX_WIDTH` (1280px), el
 * ancho de la palabra más larga ("Evoluciona", 10 caracteres) frente al
 * ancho útil del deck se verifica en navegador real (definición de "hecho"
 * de la spec), no se supone aquí.
 */
export const JOURNEY_DECK_STEP_LABEL_SIZE = "clamp(1.75rem, 10vw, 11rem)";

/**
 * Peso de la etiqueta de paso (T3, misma spec). El encargo pide 900, y hasta
 * la crítica externa #14 (2026-09-02) eso era una **excepción a `type.scale`**
 * en sentido estricto: la escala se detenía en 800 (`display`) y ninguna
 * variante declaraba un 900. Su test replicaba el de las otras dos constantes
 * de peso y dejaba escrito el punto de decisión: si algún día la escala
 * incorporase un 900, había que decidir si esta constante desaparece en favor
 * del token en vez de dejar dos fuentes conviviendo.
 *
 * LA ESCALA YA LO INCORPORÓ (`type.scale.deckClosing`, 900) Y ESTA CONSTANTE
 * SE QUEDA, deliberadamente y por escrito. `deckClosing` no es "el peldaño de
 * los pesos 900": es el CIERRE de un deck, un paquete completo de cuatro
 * propiedades donde el 900 viaja con `clamp(2.5rem, 11vw, 8rem)`, 1.03 de
 * interlineado y 0 de tracking. Esta etiqueta viste otro rol (la palabra
 * dominante de una diapositiva de paso, `JOURNEY_DECK_STEP_LABEL_SIZE`, tope
 * 11rem): derivar de ahí solo el peso diría que el peso de la etiqueta es el
 * del cierre, y ataría dos decisiones que hoy solo coinciden. Las dos que sí
 * derivan son las de cierre — `JOURNEY_DECK_QUOTE_WEIGHT` y
 * `STORY_DECK_NOTE_WEIGHT` —, porque de ese rol es exactamente el peldaño.
 *
 * El día que la etiqueta de paso quiera su propio peldaño de escala, el sitio
 * donde se decide es este docblock y su test, no un descubrimiento a
 * posteriori.
 */
export const JOURNEY_DECK_STEP_LABEL_WEIGHT = 900;

/**
 * Subtítulo de cada paso (`steps.<id>.body`, 60-80 caracteres por entrada),
 * RENOMBRADO de rol -- no de valor -- por T5 (spec
 * `2026-08-02-journey-deck-tipografia-design.md`): antes de esta entrega
 * esta constante se llamaba `JOURNEY_DECK_STEP_BODY_SIZE` y el texto que
 * pinta jugaba el rol de "cuerpo" de la diapositiva. Con la etiqueta
 * subiendo a escala de cartel (`JOURNEY_DECK_STEP_LABEL_SIZE`, 11rem), ese
 * texto deja de ser "el cuerpo" -- la etiqueta ya se lleva todo el peso
 * visual de la composición -- y pasa a jugar el rol de SUBTÍTULO que la
 * acompaña, tal como pide el encargo ("new called subtitle"). El VALOR NO
 * CAMBIA: sigue siendo `clamp(1rem, 1.4vw, 1.115rem)`, el mismo tramo que ya
 * tenía `JOURNEY_DECK_STEP_BODY_SIZE` (y que `STORY_DECK_PILLAR_BODY_SIZE`
 * viste para un texto del mismo rol de lectura en Story) -- es un
 * renombrado de PAPEL, no una recalibración de tamaño. La clave de i18n
 * (`steps.<id>.body`) tampoco se renombra: el nombre del dato no tiene por
 * qué coincidir con el nombre del rol que lo pinta (mismo criterio que
 * `pillars.<key>.body` en Story, que sigue llamándose `body` aunque hace
 * tiempo se pinta como subtítulo).
 *
 * DEJA DE DECLARAR EL LITERAL (crítica externa #14, 2026-09-02, hallazgo P3).
 * "El mismo tramo que `STORY_DECK_PILLAR_BODY_SIZE` viste para un texto del
 * mismo rol de lectura en Story" era, hasta hoy, una afirmación en prosa
 * sostenida por dos `clamp(1rem, 1.4vw, 1.115rem)` idénticos byte a byte en
 * dos ficheros que no se conocen entre sí — exactamente la forma de duplicado
 * que la regla 13 de `RULES.md` manda convertir en token. Ahora los dos
 * derivan de `type.scale.deckBody` y la frase describe el código en vez de
 * pedir confianza.
 *
 * El valor renderizado NO cambia: refactor de vocabulario, no rediseño.
 */
export const JOURNEY_DECK_STEP_SUBTITLE_SIZE = typeTokens.scale.deckBody.size;

/**
 * Icono de cada paso (D11): crece de los 20px que medía dentro de una fila
 * de lista (`ScDarkStepIcon`, retirado con esta entrega) a 48px. En la fila
 * era un adorno junto al texto; en una diapositiva a pantalla completa, sin
 * nada más compitiendo por la atención, pasa a ser el ancla visual de toda
 * la composición. Necesita su propia regla `& > svg` en el styled que lo
 * envuelve (`ScJourneyStepIconBox`, `journey.deck.tsx`): `GlobalStyles`
 * declara `svg { width: 100% }` para todo el sitio, así que el atributo
 * `width` del propio `<svg>` pierde la cascada -- la misma lección ya pagada
 * dos veces en este repo (el `Logo` del navbar y `ScDisc`, la fila de la
 * rama clara de esta misma sección).
 */
export const JOURNEY_DECK_STEP_ICON_SIZE = "48px";

/**
 * Cita de cierre (última diapositiva). **REVIERTE, a propósito, D10 de la
 * spec `2026-08-02-journey-deck-8-diapositivas-design.md`** (T6, spec
 * `2026-08-02-journey-deck-tipografia-design.md`): aquella decisión había
 * calibrado esta cita a un tope de 3.5rem PRECISAMENTE para no copiar el
 * 8rem de la nota de cierre de Story, razonando que la cita (45 caracteres,
 * "El destino no es el infinito. El viaje lo es.") es tres veces más larga
 * que "nuevo comienzo" (14 caracteres) y que a 8rem ocuparía varias líneas
 * gigantes y se comería media pantalla. El usuario, en esta entrega, pide
 * explícitamente el mismo tope que Story y su decisión manda: queda escrito
 * aquí que es una reversión CONSCIENTE de la decisión anterior, no un olvido
 * de aquel razonamiento -- el riesgo de desbordamiento que motivó D10 sigue
 * siendo real y se verifica en navegador (definición de "hecho" de la
 * spec), no se disimula.
 *
 * El valor coincidía EXACTAMENTE con `STORY_DECK_NOTE_SIZE` (T7), y hasta la
 * crítica externa #14 (2026-09-02) eso se resolvía declarando el literal aquí
 * otra vez: "coincidir hoy no es depender", constante PROPIA, sin importar
 * nada de `story.layers.ts`.
 *
 * ESA DECISIÓN SE REVISA EN LA #14 (hallazgo P3 del evaluador de Craft), y no
 * por cambiar de gusto: el argumento de T7 trataba la coincidencia como una
 * casualidad revisable entre dos composiciones, y la #14 la reclasifica como
 * lo que es -- el MISMO rol estructural, el cierre de un deck a sangre
 * completa, vestido por las dos secciones. Es el caso que la #11 ya resolvió
 * para el titular de intro. Sigue sin importarse nada de `story.layers.ts`:
 * las dos derivan de `type.scale.deckClosing`, un peldaño del SISTEMA, así
 * que el párrafo de cabecera de este bloque (las escalas de las dos secciones
 * no se acoplan entre sí) sigue intacto. Divergir mañana significa sacar a una
 * de las dos de ese peldaño con su porqué escrito, no editar un literal.
 *
 * El valor renderizado NO cambia: refactor de vocabulario, no rediseño.
 */
export const JOURNEY_DECK_QUOTE_SIZE = typeTokens.scale.deckClosing.size;

/**
 * Peso de la cita de cierre (T6, misma spec): sustituyó el `600` literal que
 * llevaba `ScJourneyQuote`. Fue una **excepción deliberada a `type.scale`**
 * mientras la escala se detuvo en 800, con un test que obligaba a revisar la
 * decisión «el día que la escala del sistema incorpore un 900».
 *
 * ESE DÍA ES LA CRÍTICA EXTERNA #14 (2026-09-02): al tokenizar el TAMAÑO de
 * la cita, el peldaño `type.scale.deckClosing` recoge el paquete entero que
 * la pieza compone -- tamaño, peso, interlineado y tracking -- y el 900 pasa
 * a vivir dentro de la escala. La constante no desaparece (sigue siendo el
 * nombre con el que Journey habla del peso de su cierre) pero deriva, que es
 * lo que aquel punto de decisión pedía en vez de dejar dos fuentes
 * conviviendo en silencio.
 *
 * Coincide EXACTAMENTE con `STORY_DECK_NOTE_WEIGHT`, y ahora por
 * construcción: las dos leen el mismo peldaño. Sigue sin importarse nada de
 * `story.layers.ts` -- el acoplamiento que D10 evitó y que el párrafo de
 * cabecera de este bloque protege era entre las dos SECCIONES, no entre una
 * sección y el sistema.
 */
export const JOURNEY_DECK_QUOTE_WEIGHT = typeTokens.scale.deckClosing.weight;

/**
 * Hueco extra a la derecha del contenido de cada diapositiva, solo en
 * pantallas grandes (`ScJourneyDeck`, `journey.deck.tsx`). Mismo recurso y
 * mismo motivo que `STORY_DECK_PADDING_INLINE_END`: rompe a propósito la
 * simetría del `padding-inline` para desplazar la columna de texto hacia la
 * izquierda y dejar respirar el lado donde la escena "Cosmic Portal" tiene
 * su figura y su camino de luz, en vez de que el texto compita con ellos por
 * el mismo eje.
 */
export const JOURNEY_DECK_PADDING_INLINE_END = "8rem";
