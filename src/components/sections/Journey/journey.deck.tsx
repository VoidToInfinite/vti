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
  JOURNEY_QUOTE_EXIT_OPACITY,
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
 *
 * LA PISTA SE DECLARA, Y CON MINIMO CERO (critica externa #19, 2026-09-04,
 * WCAG 1.4.4). Sin `grid-template-columns` la unica columna es implicita y
 * `auto`, cuyo minimo automatico es el `min-content` de lo que contiene -- y con
 * la preferencia de tamano de texto del usuario al 200 % ese minimo deja de
 * caber. Medido en Chrome real sobre el build de produccion, raiz a 32px con
 * `Page.setFontSizes` y viewport de 320 px: la caja de contenido de este deck
 * mide 144 px (320 menos sus dos railes, escritos en `rem` y por tanto tambien
 * escalados) y la pista salia de 279,39 px, asi que la diapositiva entera
 * --titulo, cuerpo, los seis pasos y la cita-- se salia 23,39 px por la derecha.
 * Y salirse aqui es perderse: `GlobalStyles` declara
 * `html, body { overflow-x: clip }`, de modo que `scrollWidth` no se mueve y
 * esos pixeles no se alcanzan con ningun gesto ni tecla.
 *
 * `minmax(0, 1fr)` deja que la pista baje del contenido; la division la resuelve
 * el `overflow-wrap` que la seccion ya declara. La diapositiva
 * (`ScJourneySlide`) sigue con `width: 100%`, asi que ocupa la pista entera pese
 * al `place-items: center`.
 */
export const ScJourneyDeck = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
  max-width: ${JOURNEY_CONTENT_MAX_WIDTH};
  margin-inline: auto;
  display: grid;
  /* Pista con minimo cero (WCAG 1.4.4, critica #19): ver el docblock. */
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  /*
   * RELLENO DEL EJE INLINE ACOTADO AL VIEWPORT (inlineSpace, no space) --
   * critica externa #20, 2026-09-05. Mismo defecto, mismo arreglo y mismo
   * motivo que en ScDeck (story.deck.tsx), donde vive el razonamiento
   * completo: los dos decks son gemelos declarados (deuda "Decks
   * Story/Journey gemelos", RULES.md) y comparten esta geometria entera. SIN
   * BACKTICKS en este comentario, a proposito: vive DENTRO del template
   * literal de styled-components, donde un backtick lo cierra y rompe el build
   * (leccion del repo, task/lessons.md 2026-07-25 y 2026-08-16 bis).
   *
   * Medido el 2026-09-05 sobre el build de produccion con la fuente al 200 %
   * (raiz 32 px) y 320 px de viewport: este relleno y el canal de aqui abajo
   * se doblaban con la fuente mientras el viewport no, y la copia del deck
   * quedaba en 144 px de 320 -- la cita de esta seccion, de 80 px, salia en
   * 142,7 px de alto repartidos en 12 lineas. inlineSpace[6] es
   * min(2rem, 10vw): vale EXACTAMENTE space[6] con la raiz por defecto
   * desde 320 px (la composicion no cambia ni un pixel) y se detiene en 32 px
   * por lado a raiz 32 px y 320 px de ancho. Solo se acota el AIRE del eje
   * inline; la tipografia crece siempre (acotarla seria el patron de fallo
   * F94 de WCAG 1.4.4) y padding-block no compite con el viewport.
   */
  padding-inline: ${({ theme }) => theme.data.inlineSpace[6]};

  /*
   * CANAL DEL RAIL (critica externa #16, hallazgo L1). MISMA suma, mismo
   * motivo y mismo orden de declaracion que en ScDeck (story.deck.tsx) -- los
   * dos decks son gemelos declarados (deuda "Decks Story/Journey gemelos",
   * RULES.md) y el rail de esta seccion tiene exactamente la misma geometria:
   * inset inlineSpace[5], diana de space[5] y un canal libre de
   * inlineSpace[2] -- los 8 px que el propio hallazgo fija como umbral, y ni
   * uno mas, porque cada pixel de canal sobrante se paga en medida de lectura
   * a 390 px (el porque completo, con la version de 6rem que se descarto, en
   * el docblock de ScDeck). Los dos terminos de AIRE se acotan al viewport
   * (critica #20) y el del medio no, porque es el ANCHO REAL de la marca del
   * rail y acotarlo reservaria menos canal del que el rail ocupa al 200 % de
   * texto: tambien ese razonamiento vive entero en ScDeck. Con la raiz por
   * defecto la suma sigue valiendo 3.5rem / 56 px, sin mover un pixel.
   * La medicion que abre el hallazgo se tomo sobre Story, pero el
   * defecto es estructural, no de una copia concreta: cualquier linea que
   * llegue al borde de la caja de contenido entra en la banda del rail. Se
   * duplica aqui en vez de importarse de alla, mismo criterio que
   * ScScrollHint y el propio rail: este fichero es una hoja estructural sin
   * ninguna dependencia de la seccion hermana.
   */
  padding-inline-end: calc(
    ${({ theme }) => theme.data.inlineSpace[5]} +
      ${({ theme }) => theme.data.space[5]} +
      ${({ theme }) => theme.data.inlineSpace[2]}
  );
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
 *
 * SIN `visibility` -- REVERSION MEDIDA de la mitad del fix wave A, hallazgo
 * A1, que aqui nunca llego a proteger nada real. Historia completa, porque
 * este punto ya se ha decidido dos veces en sentidos opuestos:
 *
 * 1. Fix wave A (2026-08-12) anadio `visibility: hidden` al reposo y
 *    `visibility: visible` a `[data-state="current"]` copiando el arreglo de
 *    ScSlide (story.deck.tsx), donde SI cerraba una trampa de foco invisible
 *    real: la Task 6 habia metido un enlace de Discord dentro de una
 *    diapositiva de Story. Aqui se aplico de forma PREVENTIVA -- el propio
 *    docblock declaraba que ninguna diapositiva de Journey monta nada
 *    focalizable -- y su coste quedo escrito como aceptable ("un lector de
 *    pantalla solo anuncia la diapositiva current, exactamente lo mismo que
 *    ve un usuario con vista").
 * 2. La critica externa #10 (2026-08-18) MIDIO ese coste, y no era el que
 *    aquel razonamiento suponia. `ariaSnapshot()` de la seccion a scroll 0
 *    devolvia solo el h2 y el parrafo de intro: `textContent` 730 caracteres
 *    frente a `innerText` 184. Los seis pasos y la cita no aparecian NUNCA
 *    salvo de uno en uno al scrollear a su posicion exacta, y un cursor
 *    virtual saltaba de la intro directamente a la seccion siguiente.
 *
 * DONDE FALLABA EL RAZONAMIENTO DE 2026-08-12, y es lo que hay que recordar:
 * decia que el contenido "sigue alcanzable exactamente por el mismo mecanismo
 * (scroll) por el que ya lo era visualmente". Eso NO es cierto para un lector
 * de pantalla: su cursor virtual recorre el ARBOL DE ACCESIBILIDAD, no
 * produce eventos de scroll y por tanto no hace avanzar el deck. Un usuario
 * con vista puede llegar a las 8 diapositivas girando la rueda; con
 * `visibility: hidden` en las no actuales, un usuario de lector de pantalla
 * no podia llegar a 7 de las 8 por ningun medio. No era "la misma experiencia
 * que un usuario vidente": era perder el contenido entero.
 *
 * POR QUE `opacity: 0` SOLO ES SUFICIENTE, Y CORRECTO: `opacity` no
 * interviene en el arbol de accesibilidad (solo lo hacen `display: none`,
 * `visibility: hidden/collapse`, `aria-hidden`, el atributo `hidden` e
 * `inert`), asi que la diapositiva sigue invisible a la vista y presente para
 * la tecnologia asistiva -- que es exactamente la linearizacion que ya
 * entrega el camino de `prefers-reduced-motion` (D12) y que ese camino NO
 * pierde con este cambio.
 *
 * LA MITAD DE A1 QUE SIGUE VIVA, y como se ata ahora: `opacity: 0` y
 * `pointer-events: none` NO sacan del orden de tabulacion. La garantia de que
 * no hay trampa de foco invisible es que ninguna diapositiva de Journey
 * contiene un elemento focalizable -- una condicion de ESTRUCTURA, no de
 * CSS -- y esa condicion pasa a estar atada por un test (Journey.test.tsx,
 * describe "critica #10 hallazgo A", ultimo it). Si manana alguien mete un
 * enlace o un boton en una diapositiva, ese candado cae en rojo y obliga a
 * resolver el foco de forma explicita (tabIndex -1 atado a data-state, o el
 * atributo inert, los dos con el mismo criterio) en vez de reintroducir un
 * `visibility: hidden` que volveria a vaciar el arbol de accesibilidad de la
 * seccion entera. Los dos controles interactivos que la rama oscura SI monta
 * -- los botones del rail (ScJourneyRailMark, mas abajo) -- viven fuera del
 * deck y estan visibles siempre, asi que no entran en este problema.
 *
 * NOTA DE ALCANCE (cerrada): ScSlide (story.deck.tsx) tenia el MISMO defecto,
 * agravado por un enlace real dentro. Se arreglo el mismo dia en la tarea
 * derivada de esta ola: misma reversion de `visibility`, con la compuerta de
 * foco movida al propio enlace (ScDeckNoteLink, Story.tsx) porque alli la
 * estructura SI admite un focalizable -- ver su docblock.
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
     seria perder CONTENIDO, no solo movimiento. Este bloque ya no necesita
     revertir ninguna visibility: el reposo dejo de declararla (ver el
     docblock de arriba). SIN BACKTICKS en este comentario, a proposito: vive
     DENTRO del template literal de styled-components (leccion del repo,
     task/lessons.md 2026-07-25). */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

/*
 * Rail de progreso (D13): refleja data-slide del stage (un ANCESTRO de
 * ScJourneyRailMark) por selector descendiente. Se retira en reduce: sin pin
 * ni avance atado al scroll, "por donde voy" deja de tener sentido -- las 8
 * diapositivas ya estan a la vista a la vez.
 *
 * DEJO DE SER aria-hidden en la critica externa #10 (hallazgo A, 2026-08-18):
 * sus marcas son ahora botones reales (ver ScJourneyRailMark, abajo), asi que
 * ocultarlo del arbol de accesibilidad esconderia ocho controles operables.
 * El nombre del grupo lo pone Journey.tsx via aria-label + role group: ocho
 * botones sueltos sin agrupar se anuncian como ocho controles sin relacion
 * entre si.
 */
export const ScJourneyRail = styled.div`
  position: absolute;
  inset-block: 0;
  /*
   * Separacion del borde ACOTADA AL VIEWPORT (critica externa #20), gemela de
   * la de ScRail en story.deck.tsx. Es el primer sumando del canal que
   * ScJourneyDeck reserva arriba y los dos tienen que moverse juntos: si el
   * inset se doblara con la fuente (48 px a raiz 32) y el canal no, el rail se
   * meteria en la copia. Es aire puro; el ANCHO de la marca
   * (ScJourneyRailMark) NO se acota, y el porque esta en el docblock del canal
   * de ScDeck.
   */
  inset-inline-end: ${({ theme }) => theme.data.inlineSpace[5]};
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

/*
 * ROTULO DE POSICION DEL RAIL (critica externa #16, decision del dueno: «hacer
 * visible el rotulo del paso activo en el rail», en los DOS decks). Fraccion
 * apilada, `aria-hidden`, gemela exacta de ScRailStatus (story.deck.tsx) --
 * leer su docblock es releer este: alli estan el defecto que cierra, el motivo
 * geometrico de que la fraccion se apile en vez de ir en linea, y por que este
 * rotulo NO se anuncia.
 *
 * En esta seccion el ultimo argumento pesa el doble, y conviene dejarlo
 * escrito aqui tambien: la numeracion hablada de Journey ya se decidio dos
 * veces. La critica #10 hizo que cada marca del rail se llamara "Ir a la
 * diapositiva N de 8" y la #12 lo midio contra el "Paso N de 6" que las
 * propias diapositivas anuncian (`Home.journey.stepPosition`, VisuallyHidden,
 * en las dos ramas), encontro un desfase de uno y retiro la numeracion del
 * rail. Este rotulo cuenta PARADAS DEL RAIL, que son ocho porque incluyen la
 * apertura y el cierre; anunciarlo devolveria a un lector de pantalla las dos
 * numeraciones desalineadas que aquella ronda quito. Visible cuenta lo que se
 * ve -- ocho puntos --, hablado sigue contando pasos.
 */
export const ScJourneyRailStatus = styled.p`
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0;
  margin-block-end: ${({ theme }) => theme.data.space[3]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: ${({ theme }) => theme.data.type.scale.caption.weight};
  line-height: ${({ theme }) => theme.data.type.scale.caption.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.caption.tracking};
  /* Cifras de ancho fijo: sin esto, pasar de "1" a "4" mueve la barra de la
     fraccion un pixel a cada cambio de diapositiva. */
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  pointer-events: none;
`;

/* El numerador: la parada activa, en el color de texto pleno. Gemelo de
   ScRailStatusCurrent (story.deck.tsx). */
export const ScJourneyRailStatusCurrent = styled.span`
  color: ${({ theme }) => theme.data.semantic.text};
`;

/* El denominador, con la barra de la fraccion como borde superior en el mismo
   token que las marcas inactivas del rail. Gemelo de ScRailStatusTotal
   (story.deck.tsx), donde vive el porque de que la barra sea geometria y no un
   caracter salido de i18n. */
export const ScJourneyRailStatusTotal = styled.span`
  border-block-start: 1px solid
    ${({ theme }) => theme.data.semantic.borderStrong};
  padding-block-start: ${({ theme }) => theme.data.space[1]};
  margin-block-start: ${({ theme }) => theme.data.space[1]};
`;

/*
 * Marca del rail (critica externa #10, hallazgo A, P2 que puntua en la
 * heuristica 7 de Nielsen). Hasta esta tarea era un `span` decorativo con
 * `tabIndex -1` heredado del `aria-hidden` del rail: se veia "por donde vas"
 * pero no se podia ir a ningun sitio, y encima apenas se veia -- los
 * inactivos pintaban `semantic.border` (neutral 800) a `opacity: 0.4` sobre
 * la escena casi negra del portal.
 *
 * TRES CAMBIOS, cada uno cerrando una mitad distinta del hallazgo:
 *
 * 1. ELEMENTO: `button` real, no `span`. Journey.tsx le pone `type="button"`,
 *    `aria-label` de i18n y `aria-current` en el activo, y engancha el salto
 *    a `scrollToSlide` (`useSlideDeck`), que invierte la geometria de la
 *    pista. Al ser un boton nativo trae foco, Enter/Espacio y rol sin nada
 *    que sincronizar a mano.
 *
 * 2. DIANA: el punto sigue midiendo space[2] (8px) -- la decision visual del
 *    rail no cambia -- pero se dibuja con `::before` DENTRO de una caja de
 *    space[5] (24px), que es el minimo de WCAG 2.5.8 (Target Size, AA en
 *    WCAG 2.2). Un boton de 8x8 es inoperable con el dedo y casi con el
 *    raton. La caja es transparente: no se ve, solo se toca.
 *
 * 3. CONTRASTE: los inactivos pasan de `semantic.border` al 40% de opacidad
 *    a `semantic.borderStrong` OPACO. La opacidad desaparece de la
 *    declaracion y de la lista de `transition` -- ya no hay nada que
 *    interpolar en ese eje. WCAG 1.4.11 pide 3:1 para un componente de
 *    interfaz frente a lo que tiene detras; el candado que lo mide contra el
 *    void real de la escena vive en Journey.test.tsx (describe "critica #10
 *    hallazgo A -- rail"). El activo conserva `semantic.brand` y su
 *    `scale(1.5)`: la jerarquia entre activo e inactivo sigue viniendo de
 *    color MAS tamano, no de que el inactivo sea invisible.
 *
 * EL SELECTOR DESCENDIENTE `[data-slide="N"] &` NO CAMBIA de forma (regla 35
 * de RULES.md): sigue leyendo el estado desde el ANCESTRO -- el `data-slide`
 * que ScJourneyStage ya escribe con el index de useSlideDeck -- y no desde un
 * atributo del propio boton. `aria-current` se anade en el JSX como senal
 * para tecnologia asistiva, no como fuente del estilo: dos fuentes de verdad
 * para lo mismo pueden divergir, y la que ya estaba probada es esta.
 */
export const ScJourneyRailMark = styled.button<{ $index: number }>`
  appearance: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: ${({ theme }) => theme.data.space[5]};
  height: ${({ theme }) => theme.data.space[5]};
  border-radius: ${({ theme }) => theme.data.radius.full};
  color: ${({ theme }) => theme.data.semantic.borderStrong};
  cursor: pointer;
  transition: color ${({ theme }) => theme.data.motion.duration.base}
    ${({ theme }) => theme.data.motion.easing.standard};

  /* El punto visible. Hereda currentColor para que el color viva en UNA sola
     declaracion (la del boton) y el estado activo no tenga que repetirlo
     sobre dos elementos. SIN BACKTICKS en este comentario, a proposito: vive
     DENTRO del template literal de styled-components, donde un backtick lo
     cierra y rompe el build (leccion del repo, task/lessons.md 2026-07-25). */
  &::before {
    content: "";
    display: block;
    width: ${({ theme }) => theme.data.space[2]};
    height: ${({ theme }) => theme.data.space[2]};
    border-radius: ${({ theme }) => theme.data.radius.full};
    background-color: currentColor;
    transform: scale(1);
    transition: transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};
  }

  &:hover {
    color: ${({ theme }) => theme.data.semantic.text};
  }

  /* AQUI VIVIO un halo de foco propio: outline: none mas un box-shadow de
     3px contra semantic.focus al 45%. Era el tercer vocabulario de anillo
     del sitio -- y el unico SUSTITUTIVO -- y ademas dejaba esta marca sin
     ningun indicador de foco bajo forced-colors, donde el navegador fuerza
     box-shadow: none y el outline: none ya habia apagado el anillo global.
     Retirado el 2026-09-02 (critica externa #14, P1 de Craft): el anillo
     unico se declara en GlobalStyles.tsx con la geometria de
     src/theme/tokens/focus.ts. El boton es redondo y outline adopta el
     border-radius del elemento, asi que el anillo sigue saliendo redondo sin
     declarar nada aqui. */

  ${({ $index, theme }) => css`
    [data-slide="${$index}"] & {
      color: ${theme.data.semantic.brand};
    }

    [data-slide="${$index}"] &::before {
      transform: scale(1.5);
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &::before {
      transition: none;
    }
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
 * `aria-hidden`, y desde la critica externa #10 es el UNICO de los dos adornos
 * del stage que lo es: el rail de al lado dejo de serlo al convertirse en ocho
 * botones operables (ver `ScJourneyRail`, arriba), mientras que esta pista no
 * gana nada al anunciarse -- no es un control y no dice "por donde voy", solo
 * "puedes seguir bajando". Reutiliza `data-slide`, que `ScJourneyStage`
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
 * PROPIA (900), no del token h4/600 que sustituyen -- excepcion deliberada a
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
 * tope). El peso deja de seguir el token h4 (600) y pasa a
 * JOURNEY_DECK_STEP_LABEL_WEIGHT (900, constante propia y no un token --
 * type.scale se detiene en 800, ver su docblock).
 *
 * line-height CAMBIADO, y esto NO lo pide el encargo -- hay que explicarlo:
 * type.scale.h4.lineHeight vale 1.35, un factor UNITLESS, y a 11rem eso
 * resuelve a ~14.9rem de caja de linea para una palabra de una sola linea --
 * unos 4rem de aire muerto que empujarian el subtitulo fuera de la
 * composicion. Es el MISMO problema y la MISMA solucion que ScDeckNote
 * (story.deck.tsx) ya documento al subir a 8rem: se reutiliza
 * type.scale.display.lineHeight (1.03), el valor ya calibrado del sistema
 * para texto de cartel, en vez de inventar un numero nuevo para esta pieza.
 * letter-spacing SIGUE el de h4 -- no hay motivo medido para cambiarlo.
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
  letter-spacing: ${({ theme }) => theme.data.type.scale.h4.tracking};
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
 * largo se extenderia sin freno. `theme.data.grid.prose` (56ch desde la critica #13; 52ch desde
 * 2026-08-17, ~65 caracteres reales;
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
 *
 * ---
 *
 * SALIDA ANTES DEL RELEVO CON FEATURES (critica externa #15, hallazgo A P2-1,
 * 2026-09-02). El porque completo -- la secuencia medida, las dos vias
 * descartadas y de donde sale el numero -- vive en el docblock de
 * JOURNEY_QUOTE_EXIT_SPAN (journey.layers.ts); aqui va lo que hace falta para
 * leer la declaracion:
 *
 * - La rampa se ancla en `progress = 1`, que NO es un instante cualquiera: es,
 *   por construccion del sistema T = R = 1, el mismo frame en el que Features
 *   empieza a subir como cortina. Con la rampa terminada ahi, la cortina cruza
 *   una escena vacia en vez de una frase a medias.
 * - `opacity` es la UNICA propiedad que cambia, y cambia por VARIABLE, no por
 *   transition: `--journey-progress` ya llega frame a frame desde useSlideDeck,
 *   asi que declarar una duracion aqui superpondria un segundo reloj al del
 *   scroll (mismo criterio que ScJourneySceneWrap, arriba en este fichero, que
 *   tampoco declara transition para su translateY ligado a la misma variable).
 * - La forma es una rampa lineal recortada: vale 1 mientras queda mas de un
 *   tramo de salida por recorrer, y baja a 0 al llegar al final. El valor por
 *   defecto de la variable es 0, asi que sin JS -- o antes del primer frame del
 *   hook -- la cita se pinta opaca, nunca invisible.
 *
 * EL GUARD DE reduce ES OBLIGATORIO, no simetria decorativa: bajo `reduce`
 * useSlideDeck se desmonta como presentacion y deja de escribir sus variables,
 * pero NO borra las que ya escribio (son estilo en linea sobre el stage). Un
 * usuario que active la preferencia con la pista terminada se quedaria con
 * `--journey-progress: 1.0000` pegado y la cita invisible para siempre, en el
 * mismo camino que D12 existe para linealizar. Con el guard, la cita se pinta
 * entera junto al resto de diapositivas en flujo.
 *
 * LO QUE NO SE DESVANECE, y es deliberado: el rail (ScJourneyRail, arriba). Sus
 * marcas son BOTONES reales desde la critica #10, y bajarles la opacidad los
 * dejaria invisibles pero focalizables -- exactamente la trampa de foco que el
 * docblock de ScJourneySlide documenta al revertir su `visibility`. Un control
 * operable no se apaga con opacity.
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
  opacity: ${JOURNEY_QUOTE_EXIT_OPACITY};

  @media (prefers-reduced-motion: reduce) {
    opacity: 1;
  }
`;
