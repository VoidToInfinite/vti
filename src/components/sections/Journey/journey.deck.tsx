"use client";
import styled, { css } from "styled-components";
import type { ThemeDefinition } from "@/theme/theme.types";
import { DECK } from "@/motion/vocabulary";
import {
  JOURNEY_CONTENT_MAX_WIDTH,
  JOURNEY_DARK_HEIGHT,
  JOURNEY_DECK_PADDING_INLINE_END,
  JOURNEY_DECK_QUOTE_SIZE,
  JOURNEY_DECK_QUOTE_WEIGHT,
  JOURNEY_DECK_STEP_ICON_SIZE,
  JOURNEY_DECK_STEP_LABEL_SIZE,
  JOURNEY_DECK_STEP_LABEL_WEIGHT,
  JOURNEY_DECK_STEP_SUBTITLE_SIZE,
  JOURNEY_DECK_TITLE_SIZE,
  JOURNEY_DECK_TRACK_HEIGHT,
  JOURNEY_SCENE_DEPTH_SHIFT,
  JOURNEY_SLIDE_SHIFT,
  type JourneyStep,
} from "./journey.layers";

/*
 * Los styled de la presentacion de 8 diapositivas de Journey (spec
 * 2026-08-02-journey-deck-8-diapositivas-design.md, D2/D7/D9/D10/D11/D12/D13,
 * seccion 4/5). MISMA TECNICA que story.deck.tsx (referencia obligatoria de
 * esta entrega), con las constantes propias de Journey: pin por
 * position: sticky sobre una pista alta, sin scroll-snap (D2 -- el snap se
 * probo en esta landing, se retiro el 2026-07-31 tras medir tirones de hasta
 * 240px, y el razonamiento completo sigue escrito al final de
 * story.deck.tsx). Puramente estructural: no conoce i18n ni el contenido de
 * las diapositivas -- eso lo compone Journey.tsx, que es quien pasa
 * data-slide-index/data-state segun el estado de useSlideDeck.
 *
 * DOS diferencias deliberadas frente a story.deck.tsx, las dos por decision
 * de esta spec y no por descuido:
 * 1) Sin "rewind" (D6): useSlideDeck sigue devolviendo `direction`, pero
 *    Journey no lo consume y aqui no existe ningun selector `[data-dir=...]`
 *    ni el @keyframes de scrub que story.deck.tsx si declara.
 * 2) Sin apertura por escala del stage (D5): la entrada de Journey ya existe
 *    y es el solape sobre Story (margin-block-start negativo, Journey.tsx);
 *    encadenar una escala aqui detras del solape serian dos animaciones de
 *    entrada compitiendo por el mismo instante. ScJourneyStage no interpola
 *    ningun transform con --journey-enter -- esa variable la sigue
 *    escribiendo el hook (es su contrato), pero aqui no la lee nadie.
 */
export const ScJourneyTrack = styled.div`
  position: relative;
  height: ${JOURNEY_DECK_TRACK_HEIGHT};

  /* D12: sin pin, la pista deja de necesitar recorrido de scroll propio --
     vuelve a medir lo que mide su contenido, en flujo normal, con las 8
     diapositivas apiladas una debajo de otra (ver ScJourneySlide). */
  @media (prefers-reduced-motion: reduce) {
    height: auto;
  }
`;

/*
 * ScJourneyStage es el UNICO hijo en flujo de ScJourneyTrack: por eso se
 * pega desde el borde superior de la pista y permanece pegado durante los
 * tramos restantes. Es tambien el UNICO elemento de toda esta composicion
 * que recorta (D2, spec seccion 4): el overscan de la escena de fondo
 * (JourneyCosmicPortal se escala 1.06x, journeyCosmicPortal.layers.ts) se
 * recorta aqui, no en ScJourney (Journey.tsx), que en esta misma entrega
 * PIERDE su propio overflow: hidden -- ver el comentario de ScJourney en
 * Journey.tsx para el porque (D7, cita el mismo precedente D15b/D15c de
 * este fichero).
 */
export const ScJourneyStage = styled.div`
  position: sticky;
  top: 0;
  height: ${JOURNEY_DARK_HEIGHT};
  overflow: hidden;

  /* D12: el pin en si es la primera baja -- sin position: sticky no hay
     nada que despegar. height: auto deja que las 8 diapositivas, ya en
     flujo (ver ScJourneyDeck/ScJourneySlide), determinen el alto real. */
  @media (prefers-reduced-motion: reduce) {
    position: static;
    height: auto;
  }
`;

/*
 * Envoltura de la escena (D10 de esta spec, mismo mecanismo que ScSceneWrap
 * en story.deck.tsx -- leer su docblock es releer este). Con el stage
 * pegado, rect.top de JourneyCosmicPortal se queda en ~0 por definicion, asi
 * que el termino de scroll de useSceneParallax no aporta profundidad
 * durante el pase de diapositivas -- comportamiento CORRECTO, no un bug a
 * compensar tocando ese hook (lo comparten Story/Features/Contact). Este
 * envoltorio, por ENCIMA de la escena, devuelve esa sensacion de profundidad
 * con un transform propio gobernado por --journey-progress.
 */
export const ScJourneySceneWrap = styled.div`
  position: absolute;
  inset: 0;
  /*
   * SOBREDIMENSION vertical, imprescindible -- mismo defecto ya pagado en
   * Story (task/lessons.md, 2026-07-31: "una capa a sangre que se traslada
   * necesita sobredimension, o descubre su borde"): este envoltorio se
   * traslada hasta JOURNEY_SCENE_DEPTH_SHIFT hacia abajo, y una capa a
   * sangre que se mueve SIN sobredimensionar descubre el borde por el que
   * se va -- deja una banda de fondo plano asomando arriba que crece
   * conforme se scrollea, y recorta otro tanto por abajo.
   *
   * Se estira un desplazamiento por CADA lado para que cualquier valor del
   * recorrido quede cubierto, mas 1px de colchon de subpixel por lado: sin
   * el, en el extremo del recorrido el borde superior aterriza EXACTAMENTE
   * en 0, y basta un redondeo de medio pixel (zoom del navegador, dvh
   * fraccionario, pantalla HiDPI) para que asome una linea del fondo. La
   * unidad es dvh en los dos sitios a proposito (ver el docblock de
   * JOURNEY_SCENE_DEPTH_SHIFT, journey.layers.ts): un % en translateY se
   * resuelve contra la altura de ESTE elemento -- que aqui ya no es la del
   * contenedor, precisamente por esta sobredimension --, mientras que en
   * top/bottom se resolveria contra la del contenedor. Dos referencias
   * distintas para la misma medida vuelven a dejar el borde descubierto.
   */
  top: calc(-1 * ${JOURNEY_SCENE_DEPTH_SHIFT} - 1px);
  bottom: calc(-1 * ${JOURNEY_SCENE_DEPTH_SHIFT} - 1px);
  transform: translateY(
    calc(${JOURNEY_SCENE_DEPTH_SHIFT} * var(--journey-progress, 0))
  );
  /* Esta capa se traslada en cada frame de scroll y contiene las 6 capas de
     JourneyCosmicPortal con alpha recta -- sin promoverla, cada
     desplazamiento obliga a recomponer ese grupo entero en el hilo
     principal. Correcto aqui porque el envoltorio se mueve durante TODO el
     recorrido de la presentacion, no en un momento puntual (el caso de uso
     para el que existe will-change). */
  will-change: transform;

  /*
   * D12, guard IMPRESCINDIBLE y nada obvio (hallazgo de la auditoria
   * adversarial de esta entrega). Bajo reduce, ScJourneyStage pasa a
   * position: static (mas arriba): deja de ser un elemento posicionado y,
   * con el, deja de ser el CONTAINING BLOCK de este envoltorio, que sigue
   * siendo absoluto. El containing block sube entonces a ScJourneyTrack
   * (position: relative incondicional), cuya altura bajo reduce es auto --
   * es decir, las 8 diapositivas apiladas en flujo, varias pantallas. Sin
   * este bloque, el inset: 0 de arriba resolveria contra esa caja y las seis
   * capas de la escena (object-fit: cover, journeyCosmicPortal.parts.tsx) se
   * estirarian a 8 pantallas de alto: el arte quedaria recortado a una
   * franja vertical con un zoom brutal. No se pierde texto -- por eso D12 se
   * cumpliria en su letra y ningun test de contenido lo veria -- pero el
   * fondo se rompe.
   *
   * El arreglo NO puede ser devolverle al stage un position: relative bajo
   * reduce: seguiria midiendo height: auto, o sea las mismas 8 pantallas, y
   * el estiramiento seria identico. Lo que cierra el fallo es dar aqui una
   * altura EXPLICITA de una pantalla y anclarla arriba, que es correcto sea
   * cual sea el ancestro que acabe haciendo de containing block. La escena
   * aparece entonces una vez, con sus proporciones intactas, detras de la
   * primera diapositiva; el resto del recorrido queda sobre el
   * background-color de la seccion, que es exactamente el secondary[1100]
   * del encargo. Se prefiere eso a display: none: bajo reduce se degrada el
   * MOVIMIENTO, no la identidad visual de la seccion.
   *
   * SIN BACKTICKS en este comentario, a proposito: vive DENTRO del template
   * literal de styled-components, donde un backtick lo cierra y rompe el
   * build (leccion del repo, task/lessons.md 2026-07-25).
   */
  @media (prefers-reduced-motion: reduce) {
    top: 0;
    bottom: auto;
    height: ${JOURNEY_DARK_HEIGHT};
    transform: none;
    /* Sin recorrido que animar, promover la capa solo gasta memoria de
       compositor. */
    will-change: auto;
  }
`;

/*
 * ScJourneyDeck acota el CONTENIDO (D2 de esta spec): la escena de fondo va
 * a sangre (100vw/JOURNEY_DARK_HEIGHT via ScJourneyStage), pero el deck de
 * cada diapositiva queda centrado y topado a JOURNEY_CONTENT_MAX_WIDTH --
 * exactamente el reparto que ya usa Story (D11 de su spec): la escena a
 * sangre y el contenido acotado conviven porque el tope lo lleva el deck, no
 * el stage. z-index: 1 lo sube por encima de ScJourneySceneWrap (que no
 * declara ninguno, asi que participa del orden normal del documento) sin
 * necesitar tocar la escena.
 */
export const ScJourneyDeck = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
  max-width: ${JOURNEY_CONTENT_MAX_WIDTH};
  margin-inline: auto;
  display: grid;
  place-items: center;
  padding-inline: ${({ theme }) => theme.data.space[6]};

  /*
   * Hueco extra a la derecha SOLO en pantallas grandes (mismo recurso que
   * STORY_DECK_PADDING_INLINE_END): rompe a proposito la simetria del
   * padding-inline de arriba para desplazar la columna de texto hacia la
   * izquierda y dejar respirar el lado por el que la escena tiene su figura
   * y su camino de luz. Va DESPUES del padding-inline de arriba a proposito:
   * la longhand tiene que ganarle a la shorthand, y con la misma
   * especificidad eso lo decide el orden de declaracion.
   */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    padding-inline-end: ${JOURNEY_DECK_PADDING_INLINE_END};
  }

  /* D12: sin grid ya no hace falta apilar las 8 diapositivas en la MISMA
     celda -- se dejan caer una debajo de otra, todas visibles (ver
     ScJourneySlide, mas abajo, donde reduce fuerza opacity/transform al
     estado final). D6: a diferencia de ScDeck en story.deck.tsx, este bloque
     no lleva ningun caracter de "rewind" -- Journey no consume direction,
     asi que no hay selector [data-dir] ni @keyframes de scrub que declarar
     bajo prefers-reduced-motion: no-preference. */
  @media (prefers-reduced-motion: reduce) {
    display: block;
    height: auto;
  }
`;

/*
 * Las 8 diapositivas se apilan con grid-area: 1 / 1 en la MISMA celda del
 * grid de ScJourneyDeck, NO con position: absolute: asi el grid les da a
 * todas el mismo tamano sin sacar ninguna del flujo, y la degradacion de
 * reduce es solo un cambio de display en el padre (ScJourneyDeck pasa a
 * block), no una reescritura del posicionamiento de cada hija. El estado
 * (data-state) lo decide el JSX de Journey.tsx comparando su indice con el
 * index del hook; este CSS solo reacciona al atributo, nunca lo calcula.
 *
 * El estado base (sin data-state="current"/"past") es el de una diapositiva
 * que TODAVIA no ha llegado ("next"): opacity 0 + desplazada hacia abajo.
 * "past" invierte el signo del desplazamiento; "current" limpia los dos.
 */
export const ScJourneySlide = styled.div`
  grid-area: 1 / 1;
  width: 100%;
  opacity: 0;
  transform: translateY(${JOURNEY_SLIDE_SHIFT});
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};
  pointer-events: none;

  &[data-state="current"] {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }

  &[data-state="past"] {
    transform: translateY(calc(${JOURNEY_SLIDE_SHIFT} * -1));
  }

  /* D12: todas visibles a la vez, en flujo -- perder 7 de 8 diapositivas
     seria perder CONTENIDO, no solo movimiento. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

/*
 * Rail de progreso decorativo (D13): aria-hidden, refleja data-slide del
 * stage (un ANCESTRO de ScJourneyRailMark) por selector descendiente. Se
 * retira en reduce: sin pin ni avance atado al scroll, "por donde voy" deja
 * de tener sentido -- las 8 diapositivas ya estan a la vista a la vez.
 */
export const ScJourneyRail = styled.div`
  position: absolute;
  inset-block: 0;
  inset-inline-end: ${({ theme }) => theme.data.space[5]};
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[2]};

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

export const ScJourneyRailMark = styled.span<{ $index: number }>`
  width: ${({ theme }) => theme.data.space[2]};
  height: ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-color: ${({ theme }) => theme.data.semantic.border};
  opacity: 0.4;
  transform: scale(1);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    background-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  ${({ $index, theme }) => css`
    [data-slide="${$index}"] & {
      opacity: 1;
      transform: scale(1.5);
      background-color: ${theme.data.semantic.brand};
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/*
 * Pista de scroll del deck (Task 4, plan
 * `2026-08-10-implementacion-plan-premium-f1-f5`), MISMA TECNICA que
 * `ScScrollHint` en `story.deck.tsx` -- leer su docblock es releer este --
 * duplicada aqui a proposito y no importada de alli, mismo criterio que
 * `stepColor` mas abajo: este fichero es una hoja estructural sin ninguna
 * dependencia de la seccion hermana.
 *
 * `aria-hidden` como `ScJourneyRail` (arriba): el rail decorativo ya
 * comunica "por donde voy" por otra via, esta pista solo dice "puedes
 * seguir bajando". Reutiliza `data-slide`, que `ScJourneyStage`
 * (Journey.tsx) YA escribe con el `index` de `useSlideDeck` -- SIN listener
 * nuevo. Visible en la diapositiva 0, desvanecida en cuanto `data-slide`
 * deja de ser "0" (selector descendiente sobre el mismo ancestro que ya lee
 * `ScJourneyRailMark`).
 *
 * `opacity` es la UNICA propiedad animada. `DECK.exitDurationMs` (200ms,
 * `vocabulary.ts`, rol "salida de un velo o capa de la presentacion")
 * consigue aqui su primer consumidor real, igual que en Story.
 *
 * Bajo `reduce` se retira POR COMPLETO (`display: none`), mismo tratamiento
 * y mismo motivo que `ScJourneyRail`: sin pin, las 8 diapositivas ya estan
 * todas en flujo a la vez, y "puedes seguir bajando DENTRO del deck" deja
 * de tener sentido. Decision de la spec ("se muestra estatico o no se
 * muestra"): aqui se elige NO MOSTRAR, coherente con el rail.
 */
export const ScJourneyScrollHint = styled.p`
  position: absolute;
  inset-inline: 0;
  inset-block-end: ${({ theme }) => theme.data.space[6]};
  z-index: 1;
  margin: 0;
  text-align: center;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.overline.size};
  font-weight: ${({ theme }) => theme.data.type.scale.overline.weight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.overline.tracking};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  pointer-events: none;
  opacity: 1;
  transition: opacity ${DECK.exitDurationMs}ms
    ${({ theme }) => theme.data.motion.easing.standard};

  [data-slide]:not([data-slide="0"]) & {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

/*
 * Color de rampa por paso (mismo cometido que `stepColor` en Journey.tsx,
 * que usan ScDisc/ScStepLabel de la rama clara). Se duplica AQUI, local a
 * este fichero, en vez de importarse desde Journey.tsx a proposito: este
 * fichero es una hoja estructural sin ninguna dependencia de la seccion que
 * lo consume (mismo limite que respeta story.deck.tsx, que no importa nada
 * de Story.tsx) -- invertir esa direccion aqui, solo para no repetir ocho
 * lineas, acoplaria el deck a su consumidor.
 */
function stepColor(
  theme: ThemeDefinition,
  step: Pick<JourneyStep, "colorRamp" | "colorStep">,
): string {
  return theme.palette[step.colorRamp][step.colorStep];
}

/*
 * Escala tipografica de cartel de la diapositiva (D10/D11, spec seccion 5).
 * Elementos PLANOS (styled.h2/styled.p/styled.span), NO styled(Typography),
 * por los mismos dos motivos que ya documenta story.deck.tsx en el docblock
 * equivalente (registro 2026-07-28, task/lessons.md):
 *
 * 1) Desacople de la rama clara: si estas piezas reutilizaran los
 *    styled(Typography) de la rama clara de Journey.tsx, cualquier ajuste de
 *    tamano aqui se filtraria tambien al tema claro. (Hasta Task 11,
 *    2026-08-09, el kicker `ScKicker` era la unica excepcion reutilizada tal
 *    cual entre las dos ramas -- se retiro de las dos, asi que ya no aplica.)
 * 2) styled(Typography) con un `as` que cambie el elemento de salida pierde
 *    TODA la escala tipografica de Typography en styled-components v6 (el
 *    prop `as` lo CONSUME el propio wrapper): estas piezas no necesitan
 *    Typography en absoluto, son de UNA composicion (un cartel a pantalla
 *    completa), no filas de una lista que reutilicen la escala del sitio.
 *
 * Familia y color salen de los MISMOS tokens que Typography aplica a
 * CUALQUIER variante (`ScTypography`: font-family type.fontBody, color
 * semantic.text). Peso/interlineado/tracking siguen el token de la variante
 * cuyo ROL sustituye cada pieza (documentado pieza a pieza mas abajo), SALVO
 * donde el propio docblock de la pieza declare una excepcion explicita:
 * ScJourneyStepLabel y ScJourneyQuote toman su font-weight de una constante
 * PROPIA (900), no del token h5/600 que sustituyen -- excepcion deliberada a
 * type.scale (se detiene en 800), spec 2026-08-02-journey-deck-tipografia-
 * design.md, T3/T6. La UNICA excepcion de COLOR -- ScJourneyStepIconBox, que
 * SI toma el color de la rampa del paso en vez de semantic.text -- sigue el
 * mismo precedente que ScPillarNumber en Story.tsx (un marcador por item, no
 * texto de cartel generico) y esta documentada en su propio docblock, mas
 * abajo. Hasta 2026-08-02 habia una SEGUNDA excepcion, ScJourneyStepNumber
 * (el numero de paso "01".."06" de la diapositiva a escala de cartel,
 * JOURNEY_DECK_STEP_NUMBER_SIZE): se retiro por completo, junto con su
 * constante de tamano, al quitar la numeracion de esta rama por encargo
 * explicito del usuario (D16). Sigue sin volver: la Task 16 llego a montar
 * un ordinal pequeno aqui y el dueno lo retiro el mismo dia -- ver la lapida
 * mas abajo, donde tambien esta como se resuelve hoy la senal de posicion
 * (texto solo para lector de pantalla, sin pieza visible).
 */
export const ScJourneyDeckTitle = styled.h2`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${JOURNEY_DECK_TITLE_SIZE};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h2.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.h2.tracking};
  /* Mismo comportamiento que Typography ya aplicaba automaticamente a sus
     variantes de encabezado -- se conserva al pasar a elemento plano, no es
     una adicion nueva. */
  text-wrap: balance;
  margin-block-start: ${({ theme }) => theme.data.space[3]};
`;

/*
 * Cuerpo de la diapositiva de intro (`Home.journey.body`): mismo tamano/peso
 * que la variante "body" del sistema -- esta pieza no forma parte del
 * encargo de los tamanos de cartel (no hay ninguna constante nueva para
 * ella en journey.layers.ts, igual que ScDeckIntroBody en story.deck.tsx),
 * asi que el token del sistema (type.scale.body) ya es el correcto.
 */
export const ScJourneyIntroBody = styled.p`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  font-weight: ${({ theme }) => theme.data.type.scale.body.weight};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.body.tracking};
  text-wrap: balance;
  text-wrap-style: balance;
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

/*
 * Envoltorio del icono de cada diapositiva de paso (D11): a diferencia de
 * ScJourneyDeckTitle/ScJourneyStepLabel/ScJourneyStepSubtitle, este SI toma el
 * color de la rampa del paso (stepColor), no semantic.text -- es el mismo
 * tratamiento que ya llevaba el icono en las dos ramas anteriores (ScDisc en
 * claro, ScDarkStepIcon en oscuro, este ultimo retirado con esta entrega):
 * el icono siempre fue una pieza coloreada por dato, nunca texto generico
 * del cartel. Crece a JOURNEY_DECK_STEP_ICON_SIZE via `& > svg`:
 * GlobalStyles fuerza `svg { width: 100% }` y el atributo `width` del icono
 * pierde la cascada (lección ya pagada dos veces en este repo -- el Logo y
 * ScDisc).
 */
export const ScJourneyStepIconBox = styled.span<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
}>`
  display: flex;
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepColor(theme.data, { colorRamp: $colorRamp, colorStep: $colorStep })};

  & > svg {
    width: ${JOURNEY_DECK_STEP_ICON_SIZE};
    height: ${JOURNEY_DECK_STEP_ICON_SIZE};
  }
`;

/*
 * AQUI VIVIO ScJourneyStepOrdinal, la linea pequena con el "01".."06" que la
 * Task 16 monto en esta rama para igualar el contenido con la clara. Retirada
 * el mismo dia por decision del DUENO (fix round de la revision): la spec
 * 2026-08-02-journey-deck-8-diapositivas-design.md, D16, recoge que se le
 * pregunto explicitamente por la asimetria clara/oscura de la numeracion y
 * respondio "solo la rama oscura" -- la asimetria VISIBLE es deliberada, no un
 * descuido, y vuelve intacta.
 *
 * Lo que SI se acepto del hallazgo es la mitad de accesibilidad: el rail de
 * progreso (ScJourneyRail, mas abajo) es aria-hidden, asi que sin ninguna otra
 * senal quien navega con lector de pantalla no sabia por que paso de la
 * secuencia iba. Eso se resuelve ahora con texto SOLO para lector de pantalla
 * (VisuallyHidden con "Paso N de 6", ver JourneyDeckDark en Journey.tsx): la
 * informacion llega a quien la necesitaba sin devolver ningun numero a la
 * pantalla. Por eso no hace falta ninguna pieza styled aqui -- VisuallyHidden
 * (src/components/ui/) ya trae su propia caja de 1x1 recortada.
 */

/*
 * Etiqueta de una sola palabra del paso ("Descubre".."Evoluciona", D11):
 * antes iba pegada al numero dentro del mismo nodo de texto
 * (ScStepLabel/ScDarkStepLabel); ahora es la pieza de cartel que se lleva
 * TODO el tamano (JOURNEY_DECK_STEP_LABEL_SIZE). `<p>`, no `<h3>` (D14): el
 * h2#journey-title de la diapositiva de intro sigue siendo el UNICO
 * encabezado accesible de la seccion. El color se queda en semantic.text --
 * el de la rampa sigue siendo exclusivo del icono (ScJourneyStepIconBox).
 *
 * Tamano y peso, T2/T3 (spec 2026-08-02-journey-deck-tipografia-design.md):
 * JOURNEY_DECK_STEP_LABEL_SIZE crece de un tramo comparable al titulo de
 * pilar de Story (tope 3rem) a ser el elemento DOMINANTE de la diapositiva
 * (tope 11rem, literal del encargo -- ver el docblock de la constante en
 * journey.layers.ts para lo medido sobre en que viewport se alcanza el
 * tope). El peso deja de seguir el token h5 (600) y pasa a
 * JOURNEY_DECK_STEP_LABEL_WEIGHT (900, constante propia y no un token --
 * type.scale se detiene en 800, ver su docblock).
 *
 * line-height CAMBIADO, y esto NO lo pide el encargo -- hay que explicarlo:
 * type.scale.h5.lineHeight vale 1.35, un factor UNITLESS, y a 11rem eso
 * resuelve a ~14.9rem de caja de linea para una palabra de una sola linea --
 * unos 4rem de aire muerto que empujarian el subtitulo fuera de la
 * composicion. Es el MISMO problema y la MISMA solucion que ScDeckNote
 * (story.deck.tsx) ya documento al subir a 8rem: se reutiliza
 * type.scale.display.lineHeight (1.03), el valor ya calibrado del sistema
 * para texto de cartel, en vez de inventar un numero nuevo para esta pieza.
 * letter-spacing SIGUE el de h5 -- no hay motivo medido para cambiarlo.
 *
 * margin-block-start SUBIDO de space[2] a space[4] (2026-08-02, al retirar
 * ScJourneyStepNumber junto con la numeracion de esta rama): NO es un
 * retoque estetico, es que la pieza que gobernaba el ritmo icono -> texto
 * dejo de existir. space[2] era el hueco pensado para que esta etiqueta
 * fuera pegada DEBAJO del numero -- que llevaba su propio
 * margin-block-start: space[4] separandolo a EL del icono. Al desaparecer
 * el numero, esta etiqueta pasa a seguir directamente al icono, y el hueco
 * que le corresponde es el que el icono tenia reservado (space[4]), no el
 * space[2] pensado para separar dos textos entre si. La Task 16 lo bajo a
 * space[2] durante unas horas, mientras el ordinal visible existio; con
 * aquel retirado (ver la lapida mas arriba), vuelve a space[4] -- el texto
 * oculto que lo sustituye no ocupa caja, asi que no cambia ningun ritmo.
 */
export const ScJourneyStepLabel = styled.p`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${JOURNEY_DECK_STEP_LABEL_SIZE};
  font-weight: ${JOURNEY_DECK_STEP_LABEL_WEIGHT};
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.h5.tracking};
  margin-block-start: ${({ theme }) => theme.data.space[4]};
`;

/*
 * Subtitulo del paso (`steps.<id>.body` -- la clave i18n NO se renombra,
 * mismo criterio que ScDeckPillarSubtitle en story.deck.tsx). RENOMBRADO de
 * ScJourneyStepBody (T5, spec 2026-08-02-journey-deck-tipografia-design.md):
 * antes se pintaba en rol `caption` (letra pequena de pie de fila,
 * ScStepBody/ScDarkStepBody), luego se promovio al rol `body` al pasar a
 * pantalla completa (entrega de la manana de este mismo dia). Con la
 * etiqueta subiendo a escala de cartel en ESTA entrega
 * (JOURNEY_DECK_STEP_LABEL_SIZE, 11rem), este texto deja de ser "el cuerpo"
 * de la diapositiva -- la etiqueta ya se lleva todo el peso visual -- y pasa
 * a jugar el rol de SUBTITULO que la acompana. Es un renombrado de ROL: el
 * VALOR no cambia (JOURNEY_DECK_STEP_SUBTITLE_SIZE sigue siendo
 * clamp(1rem, 1.4vw, 1.115rem)), y tampoco cambian peso/interlineado/
 * tracking (siguen los de `body`, no los de `caption`) ni el color
 * (textMuted, texto de acompanamiento, no el titular).
 *
 * `max-width` (Task 22, tipografia de lectura, plan premium F1-F5): NUEVO con
 * esta tarea. El detector de craft midio en runtime, en los dos gates, que
 * este parrafo no declaraba tope de ancho propio y heredaba la capacidad
 * completa de su contenedor -- 97,9-112ch a 1280px
 * (`JOURNEY_CONTENT_MAX_WIDTH`, `journey.layers.ts`, 1280px de contenido).
 * Con el copy actual ninguna instancia llega a envolver a ese ancho -- es
 * riesgo ESTRUCTURAL latente, no un defecto visible hoy -- pero un copy mas
 * largo se extenderia sin freno. `theme.data.grid.prose` (65ch,
 * `theme/tokens/grid.ts`) es el token que el sistema ya reserva para este
 * rol -- mismo arreglo y mismo token que `ScDeckPillarSubtitle`/
 * `ScDeckPillarBody` en `story.deck.tsx`, la misma tarea -- y cae dentro del
 * objetivo de legibilidad de 60-75ch del encargo.
 */
export const ScJourneyStepSubtitle = styled.p`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  font-size: ${JOURNEY_DECK_STEP_SUBTITLE_SIZE};
  font-weight: ${({ theme }) => theme.data.type.scale.body.weight};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.body.tracking};
  text-wrap: balance;
  text-wrap-style: balance;
  max-width: ${({ theme }) => theme.data.grid.prose};
  margin-block-start: ${({ theme }) => theme.data.space[3]};
`;

/*
 * Cita de cierre (ultima diapositiva). Envuelve a ScQuoteText (Journey.tsx,
 * reutilizado tal cual por las dos ramas: el degradado de texto que ya
 * existe, sin tocar) -- este elemento solo aporta tamano/peso/interlineado,
 * exactamente igual que ScQuote/ScDarkQuote antes de esta entrega, que
 * tampoco pintaban color visible propio (el span hijo lo reemplaza via
 * background-clip: text).
 *
 * Tamano y peso, T6 (spec 2026-08-02-journey-deck-tipografia-design.md):
 * JOURNEY_DECK_QUOTE_SIZE crece de un tope de 3.5rem a 8rem y el peso pasa
 * del `600` literal que llevaba esta pieza (heredado de ScQuote/ScDarkQuote)
 * a JOURNEY_DECK_QUOTE_WEIGHT (900) -- ver el docblock de las dos constantes
 * en journey.layers.ts para el porque completo: revierte D10 de la entrega
 * anterior por decision explicita del usuario, y coincide con
 * STORY_DECK_NOTE_SIZE/STORY_DECK_NOTE_WEIGHT sin importarlas (T7).
 *
 * line-height SIN TOCAR, y esto es deliberado, no un olvido: ya era
 * type.scale.display.lineHeight (1.03) desde la entrega anterior, cuando el
 * tope de esta pieza era 3.5rem -- el MISMO problema que resuelve ScDeckNote
 * en story.deck.tsx (un interlineado de factor unitless que a tamano de
 * cartel abre un hueco excesivo entre lineas) y la MISMA solucion, ya
 * aplicada aqui antes de esta entrega. Con el tope creciendo a 8rem el
 * argumento se refuerza, no cambia: sigue siendo el token correcto para este
 * tamano, asi que no hay nada que retocar.
 *
 * letter-spacing SIN TOCAR (type.scale.bodySm.tracking, 0): tampoco lo pide
 * el encargo de esta entrega, mismo motivo que antes (no introducir un
 * tracking que nadie pidio).
 */
export const ScJourneyQuote = styled.p`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  color: ${({ theme }) => theme.data.semantic.text};
  font-size: ${JOURNEY_DECK_QUOTE_SIZE};
  font-weight: ${JOURNEY_DECK_QUOTE_WEIGHT};
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.bodySm.tracking};
  text-wrap: balance;
  text-wrap-style: balance;
`;
