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
   *  y la etiqueta `0N · Label` de este paso. */
  readonly colorRamp: "primary" | "secondary" | "error";
  readonly colorStep: 500 | 600 | 700;
  /** `box-shadow` VERBATIM del disco (mockup, un valor por paso — no siguen
   *  una única fórmula, así que se listan literales en vez de derivarlos). */
  readonly discShadow: string;
}

/**
 * Orden y geometría EXACTOS del mockup (L114-143): índice = escalón `0N` y
 * escalón del stagger de reveal (`Journey.tsx` multiplica el índice por el
 * paso de ~90ms, mismo mecanismo que `ScItem` en `Features.tsx`).
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

/** Borde de los 6 discos, idéntico para todos los pasos (mockup L115 etc.). */
export const JOURNEY_DISC_BORDER = "oklch(0.9 0.03 275)";

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

/** Degradado de texto de la cita final (mockup L145, tema claro), estático
 *  (la spec no pide animarlo, a diferencia del degradado del hero en
 *  `BrandName.tsx`). Renombrado con sufijo `_LIGHT` (2026-07-30) al añadir
 *  la variante oscura de abajo. */
export const JOURNEY_QUOTE_GRADIENT_LIGHT =
  "linear-gradient(110deg, oklch(0.56 0.14 235), oklch(0.7 0.15 255), oklch(0.72 0.15 290))";

/**
 * Variante oscura del degradado de la cita (mismo criterio que
 * `STORY_ACCENT_GRADIENT_DARK`, `story.layers.ts`): misma familia de hue
 * (235/255/290), luminosidad mucho mayor para legibilidad sobre el fondo
 * oscuro de la escena. La referencia era el negro-azulado `#02040e` de
 * `JourneyAstralPathway`; desde 2026-08-01 la escena es
 * `JourneyCosmicPortal` y su lienzo es el negro-violeta `#0b0620`
 * (`JOURNEY_PORTAL_VOID`). Los valores no se retocan: siguen entre 0.78 y
 * 0.86 de luminosidad sobre un fondo que sigue siendo oscuro, y el nuevo
 * lienzo apenas es mas claro que el anterior.
 */
export const JOURNEY_QUOTE_GRADIENT_DARK =
  "linear-gradient(110deg, oklch(0.78 0.13 235), oklch(0.82 0.13 255), oklch(0.86 0.12 290))";

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
export const JOURNEY_FIGURE_WIDTH = "250px";
export const JOURNEY_FIGURE_SIZES = "305px";

/*
 * Intercambio deliberado 2026-07-28 (edicion manual del usuario, en los dos
 * lados a la vez: Story.tsx pasa a usar journey-presenting-*): Journey usa
 * la figura que originalmente se genero para Story. El alt de i18n
 * (`Home.journey.figureAlt`, "presentando el viaje con la palma abierta")
 * queda desalineado con el contenido real de esta imagen (una figura
 * senalando hacia arriba) -- señalado al usuario, no corregido aqui sin
 * consultar: el texto alternativo es contenido, no geometria de layout.
 */
export const JOURNEY_FIGURE_SRC = "/figures/story-pointing-1024.webp";
export const JOURNEY_FIGURE_SRC_SMALL = "/figures/story-pointing-640.webp";

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
 */
export const JOURNEY_CONTENT_MAX_WIDTH = "1280px";

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
 * Alto total de la pista que da recorrido de scroll a la presentación (D9):
 * a diferencia de la de Story (`STORY_DECK_TRACK_HEIGHT`), esta NO suma
 * ninguna cola. La cola de Story existe porque Journey tiene que
 * superponérsele al final de su recorrido (`JOURNEY_OVERLAY_RISE`, arriba);
 * nada tiene que superponerse a Journey -- Features, la sección siguiente,
 * no lo pide -- así que sumar una cola aquí solo dejaría una pantalla de
 * scroll muerto al final de la presentación. Se declara sin ningún término
 * adicional, y un test la compara contra esta fórmula exacta (no contra un
 * número), para que la ausencia de cola se lea como una decisión tomada y no
 * como un olvido del patrón de Story.
 */
export const JOURNEY_DECK_TRACK_HEIGHT = `calc(${JOURNEY_SLIDES} * ${JOURNEY_DARK_HEIGHT})`;

/**
 * Desplazamiento vertical de entrada/salida de cada diapositiva
 * (`data-state="past"`/`"next"`, `ScJourneySlide`). Mismo valor y mismo
 * criterio que `STORY_SLIDE_SHIFT`: lo bastante pequeño para leerse como un
 * paso dentro de la misma composición, no como un salto de layout. Se anima
 * siempre junto a `opacity`, nunca sobre una propiedad que dispare reflow
 * (regla de la casa: solo `transform`/`opacity`).
 */
export const JOURNEY_SLIDE_SHIFT = "40px";

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
 */
export const JOURNEY_SCENE_DEPTH_SHIFT = "6dvh";

/*
 * Escala tipográfica de cartel de la presentación oscura (D10/D11).
 * Constantes PROPIAS, no importadas de `story.layers.ts`: acoplar las dos
 * escalas haría que retocar el cartel de una sección moviera el de la otra,
 * y los contenidos que visten no son equivalentes en longitud -- la nota de
 * cierre de Story son 14 caracteres ("nuevo comienzo"), la cita de cierre de
 * Journey son 45 ("El destino no es el infinito. El viaje lo es."). Cada
 * tope de `clamp()` está calibrado contra el texto REAL de esta sección, no
 * copiado del tramo de Story que más se le parezca por casualidad.
 */

/**
 * `h2#journey-title` de la diapositiva de intro. Mismo rol que
 * `STORY_DECK_TITLE_SIZE` y mismo tramo: el contenido que viste ("Tu viaje
 * no tiene un último paso.", 33 caracteres) es de longitud comparable al h2
 * de intro de Story, así que el mismo tramo de cartel sirve sin recalibrar.
 */
export const JOURNEY_DECK_TITLE_SIZE = "clamp(2rem, 6vw, 4rem)";

/**
 * Etiqueta de una sola palabra de cada paso ("Descubre".."Evoluciona").
 * Mismo tramo que `STORY_DECK_PILLAR_TITLE_SIZE`: la entrada más larga de la
 * tabla ("Evoluciona", 10 caracteres) es corta y aislada, el mismo perfil
 * que el título de un pilar de Story, así que el mismo tramo de cartel
 * funciona sin recalibrar.
 */
export const JOURNEY_DECK_STEP_LABEL_SIZE = "clamp(1.75rem, 5vw, 3rem)";

/**
 * Cuerpo de cada paso (`steps.<id>.body`, 60-80 caracteres por entrada):
 * mismo tramo que `STORY_DECK_PILLAR_BODY_SIZE`, que viste un texto del
 * mismo rol de lectura (un párrafo corto de acompañamiento bajo un titular
 * de cartel). Antes de esta entrega este texto se pintaba en rol `caption`
 * -- letra pequeña de pie de fila --, un rol que tenía sentido dentro de una
 * lista de seis filas apretadas; a pantalla completa, siendo el único cuerpo
 * de texto de la diapositiva, se promueve al mismo rol de lectura que ya usa
 * Story para un texto equivalente.
 */
export const JOURNEY_DECK_STEP_BODY_SIZE = "clamp(1rem, 1.4vw, 1.115rem)";

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
 * Cita de cierre (última diapositiva). NO es el mismo tramo que la nota de
 * cierre de Story (`STORY_DECK_NOTE_SIZE`, tope 8rem): ese tope se calibró
 * para "nuevo comienzo", 14 caracteres, que cabe entero incluso a tamaño de
 * cartel extremo. La cita de Journey, "El destino no es el infinito. El
 * viaje lo es.", tiene 45 -- a 8rem ocuparía varias líneas gigantes y se
 * comería media pantalla. El tope se calibra a la baja, contra el texto real
 * de esta sección, no se copia del de Story.
 */
export const JOURNEY_DECK_QUOTE_SIZE = "clamp(1.75rem, 5.5vw, 3.5rem)";

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
