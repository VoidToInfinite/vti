"use client";
import styled, { css } from "styled-components";
import {
  STORY_DARK_HEIGHT,
  STORY_DARK_MAX_WIDTH,
  STORY_DECK_TRACK_HEIGHT,
  STORY_SCENE_DEPTH_SHIFT,
  STORY_SCRUB_MS,
  STORY_SLIDE_SHIFT,
  STORY_STAGE_ENTER_SCALE,
} from "./story.layers";

/*
 * Los styled de la presentacion de 6 diapositivas (spec
 * 2026-07-31-story-deck-hero-transition-design.md, D2-D6/D10/D13/D15b/D15c,
 * seccion 4/5). Puramente estructurales: no conocen i18n ni el contenido de
 * las diapositivas -- eso lo compone Story.tsx, que es quien pasa data-slide/
 * data-dir/data-state segun el estado del hook useStoryDeck.
 *
 * PIN por posicion pegajosa en vez de contenedor de scroll anidado (D2): un
 * contenedor con su propio overflow-y: scroll atrapa la rueda del raton
 * hasta agotar su interior antes de dejar avanzar la pagina, y ademas
 * obligaria a secuestrar el scroll a mano. Con ScStage pegado dentro de
 * ScTrack, el usuario sigue haciendo scroll de PAGINA normal: la escena se
 * queda en pantalla porque esta pegada, no porque algo intercepte el evento.
 * De regalo, el progreso 0..1 que da el hook es reversible por construccion
 * -- exactamente lo que el caracter de "rewind" del encargo necesita.
 */
export const ScTrack = styled.div`
  position: relative;
  height: ${STORY_DECK_TRACK_HEIGHT};

  /* D6: sin pin, la pista deja de necesitar recorrido de scroll propio --
     vuelve a medir lo que mide su contenido, en flujo normal. */
  @media (prefers-reduced-motion: reduce) {
    height: auto;
  }
`;

/*
 * ScStage es el UNICO hijo en flujo de ScTrack: por eso se pega desde el
 * borde superior de la pista y permanece pegado durante los tramos
 * restantes (comentario de la spec, seccion 4). Su overflow: hidden es el
 * unico que le queda a esta composicion (D15b/D15c): ScStory, mas arriba en
 * el arbol, PIERDE el suyo, porque cualquier ancestro con overflow distinto
 * de visible/clip rompe position: sticky. El recorte del overscan de la
 * escena (StoryCosmicHeart se escala 1.06x) lo hace este elemento, que no es
 * ancestro de si mismo.
 *
 * La interpolacion de escala/radio usa --story-enter con su valor por
 * defecto en el estado FINAL (var(--story-enter, 1)): si el rAF del hook
 * nunca corre -- sin JS, primer frame antes de que escriba, o
 * prefers-reduced-motion -- el stage se ve a escala 1 y sin radio, es decir
 * YA ABIERTO. Encogerlo por defecto dejaria la presentacion ilegible en
 * cualquiera de esos casos.
 */
export const ScStage = styled.div`
  position: sticky;
  top: 0;
  height: ${STORY_DARK_HEIGHT};
  overflow: hidden;
  background-color: ${({ theme }) => theme.data.semantic.bg};
  transform-origin: center;
  transform: scale(
    calc(
      ${STORY_STAGE_ENTER_SCALE} + (1 - ${STORY_STAGE_ENTER_SCALE}) *
        var(--story-enter, 1)
    )
  );
  border-radius: calc(
    ${({ theme }) => theme.data.radius["2xl"]} * (1 - var(--story-enter, 1))
  );

  /* D6: el pin en si es la primera baja -- sin position: sticky no hay nada
     que despegar ni escalar. */
  @media (prefers-reduced-motion: reduce) {
    position: static;
    height: auto;
    transform: none;
  }
`;

/*
 * Envoltura de la escena (D10): con el stage pegado, rect.top de
 * StoryCosmicHeart se queda en ~0 por definicion, asi que el termino de
 * scroll de useSceneParallax no aporta profundidad durante el pase de
 * diapositivas -- comportamiento CORRECTO, no un bug a compensar tocando ese
 * hook (lo comparten Journey/Features/Contact). Este envoltorio, por ENCIMA
 * de ScScene (que ya lleva isolation: isolate en storyCosmicHeart.parts.tsx),
 * devuelve esa sensacion de profundidad con un transform propio gobernado
 * por --story-progress, sin arriesgar ninguna otra seccion.
 */
export const ScSceneWrap = styled.div`
  position: absolute;
  inset: 0;
  /*
   * SOBREDIMENSION vertical, imprescindible: este envoltorio se traslada
   * hasta STORY_SCENE_DEPTH_SHIFT hacia abajo, y una capa a sangre que se
   * mueve SIN sobredimensionar descubre el borde por el que se va -- deja
   * una banda de fondo plano asomando arriba que crece conforme se
   * scrollea, y recorta otro tanto por abajo. Fue exactamente el defecto
   * reportado tras la primera entrega ("las diapositivas se desplazan hacia
   * abajo, no se mantienen en el alto de la vista"): el pin sujetaba bien,
   * lo que se movia era esta capa.
   *
   * Se estira un desplazamiento por CADA lado (arriba y abajo) para que
   * cualquier valor del recorrido quede cubierto. El +1px extra por lado es
   * colchon de subpixel: sin el, en el extremo del recorrido el borde
   * superior aterriza EXACTAMENTE en 0, y basta un redondeo de medio pixel
   * (zoom del navegador, dvh fraccionario, pantalla HiDPI) para que asome
   * una linea del fondo. Un pixel de mas no se ve y cierra esa clase de
   * fallo entera. Y la unidad es dvh en los dos sitios a proposito (ver el
   * docblock de STORY_SCENE_DEPTH_SHIFT): un % en translateY se resuelve
   * contra la altura de ESTE elemento -- que aqui ya no es la del
   * contenedor, precisamente por esta sobredimension -- mientras que en
   * top/bottom se resolveria contra la del contenedor. Dos referencias
   * distintas para la misma medida vuelven a dejar el borde descubierto.
   */
  top: calc(-1 * ${STORY_SCENE_DEPTH_SHIFT} - 1px);
  bottom: calc(-1 * ${STORY_SCENE_DEPTH_SHIFT} - 1px);
  transform: translateY(
    calc(${STORY_SCENE_DEPTH_SHIFT} * var(--story-progress, 0))
  );
  /* Esta capa se traslada en cada frame de scroll y contiene las 8 capas
     de la escena con mix-blend-mode: sin promoverla, cada desplazamiento
     obliga a recomponer ese grupo entero en el hilo principal. Declararlo
     aqui, y no en un estado transitorio, es correcto en este caso concreto
     porque el envoltorio se mueve durante TODO el recorrido de la
     presentacion, no en un momento puntual -- que es justo el caso de uso
     para el que existe will-change. */
  will-change: transform;
`;

/*
 * ScDeck acota el CONTENIDO (D11): la escena de fondo va a sangre (100vw/
 * 100dvh via ScStage), pero el deck de cada diapositiva queda centrado y
 * topado a STORY_DARK_MAX_WIDTH. z-index: 1 lo sube por encima de
 * ScSceneWrap (que no declara ninguno, asi que participa del orden normal
 * del documento) sin necesitar tocar la escena.
 */
export const ScDeck = styled.div`
  position: relative;
  z-index: 1;
  height: 100%;
  width: 100%;
  max-width: ${STORY_DARK_MAX_WIDTH};
  margin-inline: auto;
  display: grid;
  place-items: center;
  padding-inline: ${({ theme }) => theme.data.space[6]};

  /* D6: sin grid ya no hace falta apilar las 6 diapositivas en la MISMA
     celda -- se dejan caer una debajo de otra, todas visibles (ver ScSlide,
     mas abajo, donde reduce fuerza opacity/transform al estado final). */
  @media (prefers-reduced-motion: reduce) {
    display: block;
    height: auto;
  }

  /*
   * Caracter de "rewind" (spec seccion 5c): data-dir vive en ScStage, un
   * ANCESTRO de este elemento, no en el mismo nodo -- por eso el selector es
   * descendiente ([data-dir="rewind"] &) y no un modificador propio
   * (&[data-dir="rewind"]), que solo matchearia si el atributo estuviera en
   * ESTE elemento (misma leccion documentada en CLAUDE.md sobre CSS con
   * atributos de estado). Sin el detalle del scrub, invertir el sentido
   * seria indistinguible de "ir hacia atras despacio"; con el, se lee como
   * cinta rebobinando. El @keyframes vive DENTRO de este bloque
   * no-preference a proposito, no como un objeto Keyframes de
   * styled-components declarado aparte: asi el texto de la regla inyectada
   * demuestra que el scrub no existe en absoluto fuera de esta condicion
   * (verificado por texto de CSS, jsdom no evalua @media ni ejecuta
   * animaciones).
   */
  @media (prefers-reduced-motion: no-preference) {
    [data-dir="rewind"] & {
      animation: story-deck-scrub ${STORY_SCRUB_MS}ms
        ${({ theme }) => theme.data.motion.easing.standard} both;
    }

    @keyframes story-deck-scrub {
      0% {
        transform: translateX(0);
        opacity: 1;
      }
      40% {
        transform: translateX(calc(${STORY_SLIDE_SHIFT} / -4));
        opacity: 0.75;
      }
      100% {
        transform: translateX(0);
        opacity: 1;
      }
    }
  }
`;

/*
 * Las 6 diapositivas se apilan con grid-area: 1 / 1 en la misma celda del
 * grid de ScDeck, NO con position: absolute (D6/spec seccion 4.2): asi el
 * grid les da a todas el mismo tamano sin sacar ninguna del flujo, y la
 * degradacion de reduce es solo un cambio de display en el padre (ScDeck
 * pasa a block), no una reescritura del posicionamiento de cada hija. El
 * estado (data-state) lo decide el JSX de Story.tsx comparando su indice con
 * el index del hook; este CSS solo reacciona al atributo, nunca lo calcula.
 *
 * El estado base (sin data-state="current"/"past") es el de una diapositiva
 * que TODAVIA no ha llegado ("next"): opacity 0 + desplazada hacia abajo.
 * "past" invierte el signo del desplazamiento; "current" limpia los dos.
 */
export const ScSlide = styled.div`
  grid-area: 1 / 1;
  width: 100%;
  opacity: 0;
  transform: translateY(${STORY_SLIDE_SHIFT});
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
    transform: translateY(calc(${STORY_SLIDE_SHIFT} * -1));
  }

  /* D6: todas visibles a la vez, en flujo -- la degradacion a documento que
     el encargo de accesibilidad exige (perder 5 de 6 diapositivas seria
     perder CONTENIDO, no solo movimiento). */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
`;

/*
 * Rail de progreso decorativo (D13): aria-hidden, refleja data-slide del
 * stage (un ANCESTRO de ScRailMark) por el mismo selector descendiente que
 * ya usa el scrub de ScDeck. Se retira en reduce: sin pin ni avance atado al
 * scroll, "por donde voy" deja de tener sentido -- todas las diapositivas ya
 * estan a la vista a la vez.
 */
export const ScRail = styled.div`
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

export const ScRailMark = styled.span<{ $index: number }>`
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
 * AQUI VIVIERON ScSnapPoints/ScSnapPoint, las 6 anclas de scroll-snap (D3).
 * RETIRADAS el 2026-07-31 junto con el scroll-snap-type de GlobalStyles: se
 * ejecuto el plan de retirada que la propia spec dejaba escrito, tras
 * medirlo en navegador.
 *
 * El motivo: las anclas median exactamente una pantalla, asi que CUALQUIER
 * posicion de scroll caia siempre a menos de media pantalla de una. Con esa
 * geometria, proximity deja de comportarse como proximity y degenera en
 * mandatory. Medido pidiendo posiciones concretas y viendo donde aterrizaba
 * de verdad: 900 -> 720, 1200 -> 1440, 3100 -> 2880; tirones de hasta 240px,
 * a veces EN CONTRA del sentido del gesto, y otras veces ninguno. De ahi el
 * "el scroll a veces no funciona" que reporto el usuario.
 *
 * La vista sigue atada sin ellas: de eso se encarga el pin de ScStage. El
 * snap solo anadia el acople a cada diapositiva y lo pagaba con el control
 * del usuario sobre su propio scroll, que es un precio que no compensa.
 */
