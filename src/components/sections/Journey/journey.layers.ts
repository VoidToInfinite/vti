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
 * tras la crítica externa #11 (2026-08-18): `JOURNEY_DECK_TITLE_SIZE` pasa a
 * derivar de un TOKEN del sistema (`type.scale.deckTitle`), no de la constante
 * de Story -- ninguna de las dos secciones importa nada de la otra, que es lo
 * que este párrafo protege. La mayoría de los
 * topes de `clamp()` siguen calibrados contra el texto REAL de esta sección
 * (la etiqueta de paso, una sola palabra; el subtítulo de paso, 60-80
 * caracteres) -- salvo la cita de cierre (`JOURNEY_DECK_QUOTE_SIZE`/
 * `JOURNEY_DECK_QUOTE_WEIGHT`), que la spec de tipografía REVIERTE a
 * propósito para que coincida EXACTAMENTE con la nota de cierre de Story
 * (`STORY_DECK_NOTE_SIZE`/`STORY_DECK_NOTE_WEIGHT`, 8rem/900). La excepción
 * se documenta en el docblock de esas dos constantes, más abajo, no aquí,
 * para no repetir el mismo razonamiento en dos sitios.
 */

/**
 * `h2#journey-title` de la diapositiva de intro. Mismo rol que
 * `STORY_DECK_TITLE_SIZE` y mismo tramo: el contenido que viste ("Tu viaje
 * no tiene un último paso.", 33 caracteres) es de longitud comparable al h2
 * de intro de Story, así que el mismo tramo de cartel sirve sin recalibrar.
 *
 * DEJA DE DECLARAR EL LITERAL (crítica externa #11, 2026-08-18, hallazgo C).
 * "Mismo tramo que Story" era una afirmación en prosa sostenida por dos
 * `clamp(2rem, 6vw, 4rem)` idénticos byte a byte en dos ficheros que no se
 * conocen entre sí -- exactamente la forma de duplicado que la regla 13 de
 * `RULES.md` manda convertir en token. Ahora los dos derivan de
 * `type.scale.deckTitle` y la frase describe el código en vez de pedir
 * confianza.
 *
 * ESTE CASO ES DISTINTO del de `JOURNEY_DECK_QUOTE_SIZE`/`_WEIGHT` (más
 * abajo), que TAMBIÉN coinciden hoy con su pareja de Story y que a propósito
 * NO se acoplan: aquellas dos son medidas de cartel de una composición
 * concreta cuya coincidencia es una decisión revisable (su docblock lo
 * declara, y un test es el punto donde se decidiría divergir). Esta, en
 * cambio, viste el MISMO rol estructural en las dos secciones -- el titular de
 * la diapositiva de intro de un deck -- así que su coincidencia no es una
 * casualidad que convenga poder deshacer, es la definición del peldaño. El
 * porqué completo del token, incluido por qué su tope supera al de `display`,
 * vive en el docblock de `deckTitle` (`src/theme/tokens/type.ts`).
 *
 * El valor renderizado NO cambia: refactor de vocabulario, no rediseño.
 */
export const JOURNEY_DECK_TITLE_SIZE = typeTokens.scale.deckTitle.size;

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
 * Peso de la etiqueta de paso (T3, misma spec). **Excepción deliberada a
 * `type.scale`**, que se detiene en 800 (`display`): el encargo pide 900 y
 * ninguna variante del sistema lo declara. Mismo tratamiento y mismo motivo
 * que `STORY_DECK_NOTE_WEIGHT` (`story.layers.ts`) -- constante propia, no
 * un token nuevo en `type.scale`, con un test que replica exactamente el
 * suyo (`journey.layers.test.ts`): si algún día la escala del sistema
 * incorporara un 900, ese test obliga a decidir si esta constante
 * desaparece en favor del token, en vez de dejar dos fuentes conviviendo en
 * silencio.
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
 */
export const JOURNEY_DECK_STEP_SUBTITLE_SIZE = "clamp(1rem, 1.4vw, 1.115rem)";

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
 * El valor coincide EXACTAMENTE con `STORY_DECK_NOTE_SIZE` (T7): coincidir
 * hoy no es depender -- se declara como constante PROPIA, sin importarla de
 * `story.layers.ts` (ver el docblock de `JOURNEY_DECK_QUOTE_WEIGHT`, justo
 * abajo, para el razonamiento completo de por qué no se acopla).
 */
export const JOURNEY_DECK_QUOTE_SIZE = "clamp(2.5rem, 11vw, 8rem)";

/**
 * Peso de la cita de cierre (T6, misma spec): sustituye el `600` literal que
 * llevaba `ScJourneyQuote` hasta hoy. **Excepción deliberada a
 * `type.scale`**, que se detiene en 800: mismo motivo y mismo tratamiento
 * que `STORY_DECK_NOTE_WEIGHT`/`JOURNEY_DECK_STEP_LABEL_WEIGHT` -- constante
 * propia, con un test que obliga a revisar la decisión el día que la escala
 * del sistema incorpore un 900.
 *
 * Coincide EXACTAMENTE con `STORY_DECK_NOTE_WEIGHT` (T7): el tamaño Y el
 * peso de esta cita son, hoy, los mismos que los de la nota de cierre de
 * Story. Aun así NO se importan esas constantes -- se declaran las dos
 * propias, aquí -- porque coincidir hoy no es depender: importar las de
 * Story ataría el cartel de ESTA sección a cualquier retoque futuro de la
 * OTRA, exactamente lo que D10 (arriba) evitó la primera vez y lo que el
 * propio repo ya practica entre secciones (`story.layers.ts` y
 * `journey.layers.ts` no se importan entre sí en ningún otro punto). Si el
 * día de mañana esta pareja diverge de la de Story a propósito, el sitio
 * donde se decide es el test que las compara (`journey.layers.test.ts`), no
 * un descubrimiento a posteriori en el navegador.
 */
export const JOURNEY_DECK_QUOTE_WEIGHT = 900;

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
