"use client";
import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes, type DefaultTheme } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useSlideDeck } from "@/hooks/useSlideDeck";
import { PRESS } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { StoryCosmicBeing } from "@/components/scenes/storyCosmicBeing/StoryCosmicBeing";
import {
  ScDeck,
  ScDeckIntroBody,
  ScDeckNote,
  ScDeckNoteAccent,
  ScDeckPillarBody,
  ScDeckPillarSubtitle,
  ScDeckPillarTitle,
  ScDeckTitle,
  ScRail,
  ScRailMark,
  ScSceneWrap,
  ScSlide,
  ScStage,
  ScTrack,
} from "./story.deck";
import {
  STORY_ACCENT_GRADIENT_DARK,
  STORY_ACCENT_GRADIENT_LIGHT,
  STORY_DECK_TAIL_SCREENS,
  STORY_FIGURE_ASPECT,
  STORY_FIGURE_FLOAT_MS,
  STORY_FIGURE_HEIGHT,
  STORY_FIGURE_SCROLL_SHIFT,
  STORY_FIGURE_SIZES,
  STORY_FIGURE_WIDTH,
  STORY_FLOAT_AMPLITUDE,
  STORY_HALO_GRADIENT,
  STORY_HALO_INSET,
  STORY_SLIDES,
} from "./story.layers";

/*
 * Story ("Why VoidToInfinite?"). Rama CLARA (mockup `Landing v2.dc.html`
 * L70-131): grid figura+contenido (L70-101) seguido del statement a
 * pantalla completa (L127-131, D11/D12 de la segunda ronda, spec
 * 2026-08-06-story-features-tema-claro-design.md).
 *
 * Rama OSCURA (spec 2026-07-29): no hay mockup oscuro de esta seccion. En
 * vez de la figura recortada + halo + statement, el fondo es la escena
 * parallax `StoryCosmicBeing` (11 capas, D1-D12 del spec 2026-07-29) y el
 * contenido (mismo i18n `Home.story.*`) se superpone encima. La nota se
 * conserva como diapositiva de cierre, partida en `Home.story.noteLead` +
 * `Home.story.noteAccent` (T3, spec 2026-07-31-story-deck-tipografia-design.md)
 * -- claves DISTINTAS de `Home.story.statement.*`, que solo consume la rama
 * clara (D12 de la segunda ronda: "noteLead/noteAccent no se tocan").
 *
 * `themeName` decide la rama (no `theme.data.isLight`): mismo criterio que
 * `HomeSections.tsx`, que ya usa `useTheme()` de `@/theme/ThemeProvider`
 * para esta misma decision.
 */

/* Flotacion de la figura EN CLARO (mismo keyframe que el mockup tambien
   aplicaba a la tarjeta de nota, con otra duracion -- ver STORY_CARD_FLOAT_MS
   en story.layers.ts). La tarjeta de nota y su flotacion se retiraron en la
   segunda ronda de esta entrega (D12, spec 2026-08-06): la nota pasa a
   statement a pantalla completa, sin flotacion propia. La rama oscura no usa
   este keyframe: su unica animacion es el pulso del nucleo, declarado en
   storyCosmicBeing.parts.tsx. */
const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(${STORY_FLOAT_AMPLITUDE}); }
`;

const PILLARS = [
  { key: "learn", number: "01" },
  { key: "create", number: "02" },
  { key: "grow", number: "03" },
  { key: "practice", number: "04" },
] as const;

/** Color de cada numero de pilar: los tres primeros son pasos reales de
 *  `palette.primary`/`palette.secondary` (mockup L82/87/92: `--primary-500`,
 *  `--secondary-500`, `--secondary-600`) -- referencia directa al tema, no
 *  un literal nuevo. El cuarto pilar ("practice", 2026-07-28) continua la
 *  MISMA rampa un paso mas (`secondary[700]`). `palette.*` no cambia entre
 *  temas (vive en `shared` de `themes.ts`), asi que estos colores sirven
 *  tal cual en las dos ramas. */
function pillarColor(
  index: number,
): (props: { theme: DefaultTheme }) => string {
  return ({ theme }) => {
    if (index === 0) return theme.data.palette.primary[500];
    if (index === 1) return theme.data.palette.secondary[500];
    if (index === 2) return theme.data.palette.secondary[600];
    return theme.data.palette.secondary[700];
  };
}

/*
 * Constantes de esta entrega (tarjetas de pilar, mockup L86-123, spec
 * 2026-08-06-story-features-tema-claro-design.md D2/D3/D4/D9): valores que
 * el mockup fija en px/ms y para los que el sistema de tokens no tiene un
 * paso equivalente. Viven aquí, junto al componente que los consume -- no en
 * story.layers.ts, que documenta en su propia cabecera que solo contiene
 * arte VERBATIM de la reescritura 2026-07-28/2026-07-31, ajena a esta
 * entrega.
 */
/** Badge cuadrado del número de cada tarjeta (mockup L88/97/106/115: 38px):
 *  ningún paso de `radius`/`space` mide exactamente esto. */
const STORY_CARD_BADGE_SIZE = "2.375rem";
/** Hover de tarjeta (D3, mockup `style-hover`): `translateY(-3px)`, un
 *  desplazamiento demasiado pequeño para ningún paso de `space`. */
const STORY_CARD_HOVER_LIFT = "-3px";
/** Entrada escalonada (D9): 640ms/`translateY(22px)` son los valores DEL
 *  MOCKUP para las 7 piezas que se revelan en cascada (barra+kicker, h2,
 *  body, las 4 tarjetas) -- ninguno coincide con un paso de
 *  `motion.duration`/`space`, igual que `STORY_FIGURE_FLOAT_MS`
 *  (story.layers.ts). La curva SÍ es de tema: `motion.easing.standard` es la
 *  misma `cubic-bezier(0.4,0,0.2,1)` que pide el mockup. */
const STORY_REVEAL_DURATION_MS = 640;
const STORY_REVEAL_TRANSLATE = "22px";
/** Retardo de cada pieza en cascada, mismo orden que el mockup (L74-121):
 *  barra+kicker, h2, body, tarjeta 1..4 (D9). */
const STORY_REVEAL_DELAY_EYEBROW_MS = 0;
const STORY_REVEAL_DELAY_TITLE_MS = 80;
const STORY_REVEAL_DELAY_BODY_MS = 140;
const STORY_CARD_REVEAL_DELAYS_MS = [200, 260, 320, 380] as const;
/** Interlineado del párrafo de inspiración (D2, mockup L96:
 *  `line-height: 1.7`): ninguna variante de `type.scale` mide un cuerpo de
 *  texto a este interlineado (bodySm da 1.55) -- mismo recurso que
 *  `ScDeckPillarBody`/`ScDeckNote` (story.deck.tsx) ya usan para el mismo
 *  problema en la diapositiva oscura. */
const STORY_CARD_INSPIRATION_LINE_HEIGHT = 1.7;

/*
 * Statement a pantalla completa (D12, segunda ronda 2026-08-06 de esta misma
 * spec: la nota de cierre de Story, promovida a bloque de cartel tras la
 * rejilla -- mockup L127-131). Los valores de aqui abajo son VERBATIM del
 * mockup, salvo el divisor de ancho (nuevo, ver `storyStatementFontSize` mas
 * abajo). Ninguno tiene equivalente en `motion.*`/`type.scale` -- mismo
 * criterio que el resto de constantes de esta entrega (D2/D3/D4/D9, arriba).
 *
 * Cuarta ronda (D1/D3, spec 2026-08-07-story-statement-scroll-observer-design.md):
 * el bloque deja de recorrerse con el scroll (D13 de la tercera ronda,
 * `useSlideDeck`) y pasa a revelarse con un `IntersectionObserver` de ida y
 * vuelta (`useReveal({ once: false })`, ver StoryLight mas abajo) -- el
 * encargo pide "cuando se llegue al elemento" y, al retroceder, la animacion
 * "a la inversa", no un recorrido paso a paso anclado por scroll.
 */
/** Duracion de la entrada de cada linea (mockup L128-130): no coincide con
 *  ningun paso de `motion.duration` (el mas cercano de la familia general de
 *  interfaz, `slower`, es 480ms; `ambient` -- que hubiera sido el paso mas
 *  cercano hasta esta entrega -- se retiro por 0 consumidores, ver
 *  `src/theme/tokens/motion.ts`). */
const STORY_STATEMENT_REVEAL_MS = 900;
/** Curva de la entrada (mockup L128-130): ninguna de las cinco curvas de
 *  `motion.easing` tiene estos cuatro puntos de control -- ni siquiera
 *  `overshoot` (la unica no monotona de la escala). Constante local
 *  documentada, mismo recurso que `STORY_REVEAL_DURATION_MS` mas arriba en
 *  este fichero para el mismo problema. */
const STORY_STATEMENT_EASING = "cubic-bezier(0.22, 0.61, 0.36, 1)";
/*
 * D5 (spec 2026-08-07): las tres constantes de retardo, retiradas en D13
 * (tercera ronda, 2026-08-06) cuando el paso lo marcaba el usuario con su
 * propio scroll, VUELVEN -- con el observer las tres lineas intersecan a la
 * vez salvo que algo las escalone, y el encargo las pide en cascada ("el
 * primero..., el segundo..., el tercero..."). Mismos valores del mockup que
 * ya llevaban antes de D13.
 */
const STORY_STATEMENT_DELAY_FIRST_MS = 0;
const STORY_STATEMENT_DELAY_SECOND_MS = 220;
const STORY_STATEMENT_DELAY_THIRD_MS = 440;

/*
 * AQUI VIVIERON STORY_STATEMENT_LINES/_TAIL_SCREENS/_SCREEN_HEIGHT/
 * _TRACK_HEIGHT, la geometria de la pista de 400dvh que D13 (tercera ronda,
 * 2026-08-06) necesitaba para que `useSlideDeck` tuviera un recorrido de
 * scroll que medir. Retiradas en D1/D2 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md: el bloque vuelve a
 * ser un `<section>` normal en flujo (`min-height: 100dvh`, sin pista ni
 * pin), asi que no hay ninguna geometria de scroll que declarar -- el
 * disparo lo da un `IntersectionObserver` sobre el propio texto (ver
 * StoryLight, mas abajo), no una medida en pantallas.
 */
/** `line-height`/`letter-spacing` del cartel (mockup L128-130: `1.04`/
 *  `-0.03em`): la variante mas cercana de `type.scale`, `display`, da
 *  1.03/-0.02em -- lo bastante distinto del pedido del mockup para no
 *  reutilizarla sin alterar la composicion que el usuario aprobo. */
const STORY_STATEMENT_LINE_HEIGHT = 1.04;
const STORY_STATEMENT_LETTER_SPACING = "-0.03em";
/** Suelo/techo de la tipografia fluida (mockup: `max(24px, min(10.5vw,
 *  19.2vh, 340px))`). Ver `storyStatementFontSize`, debajo, para el termino
 *  ANADIDO que acota tambien por ancho disponible -- el riesgo que la propia
 *  spec señala: con `white-space: nowrap`, esta formula por si sola puede
 *  desbordar horizontalmente en viewports estrechos. */
const STORY_STATEMENT_MIN_SIZE = "24px";
const STORY_STATEMENT_MAX_SIZE = "340px";

/**
 * Tamano de fuente de las tres lineas del statement (D12). Envuelve la
 * formula VERBATIM del mockup (`max(24px, min(10.5vw, 19.2vh, 340px))`) en
 * un `min()` EXTERIOR con un tope derivado del ancho disponible: el mockup
 * es un lienzo fijo de 1280px y puede permitirse ignorar el ancho real de la
 * ventana; este sitio no.
 *
 * Criterio del tope, documentado porque es una ESTIMACION (no hay navegador
 * en este entorno para medirlo -- ver el informe de la entrega): la linea
 * mas larga de las tres, en las dos copias publicadas, es "un nuevo
 * comienzo" (es, 17 caracteres con espacios; "a new beginning", en, tiene
 * 15). Para palo-seco en mayusculas y negrita, ~0.6em de avance medio por
 * caracter es la cifra habitual citada; aqui se usa 0.65em A PROPOSITO por
 * encima de esa cifra (un ancho asumido mayor da un tope MENOR, nunca al
 * reves -- mas margen de seguridad), y el producto (17 * 0.65 = 11.05) se
 * redondea AL ALZA a 12 por el mismo motivo. El resultado es
 * `calc((100vw - 2 * pad) / 12)`, donde `pad` es `var(--story-statement-pad)`
 * (Regla 13 del manual: no un literal nuevo) -- la MISMA custom property que
 * `ScStatement` declara para su `padding-inline` (ver su docblock, mas
 * abajo), asi que las dos no pueden desincronizarse ni cuando el pad cambia
 * de valor por breakpoint: un `var()` se resuelve de nuevo en cada
 * recalculo del navegador con el valor que la cascada tenga vigente en ESE
 * viewport -- a diferencia de un valor de tema leido en JS (fijo desde el
 * primer render), esto seria mobile-first sin que esta funcion necesite
 * saber en que breakpoint esta.
 *
 * Desigualdad que fija el pad base (Regla 24 del manual): en el viewport MAS
 * estrecho soportado (320px), el termino de ancho tiene que seguir en el
 * suelo de legibilidad o por encima --
 * `(320px - 2 * pad) / 12 >= 24px`. Despejando,
 * `pad <= (320px - 24px * 12) / 2 = 16px`. `theme.data.space[4]` (16px) es
 * EXACTAMENTE ese limite (igualdad, no margen de sobra):
 * `(320 - 2 * 16) / 12 = 24,00px` en el viewport minimo -- el suelo deja de
 * poder perforarse (el parrafo anterior de este mismo docblock, antes de
 * esta tarea, documentaba lo contrario: quedaba una eleccion consciente
 * "puede pisar el suelo, es aceptable"; con el pad mobile-first ya no hace
 * falta esa concesion). Desde `sm` (600px) el pad sube a
 * `theme.data.space[6]` (32px, el valor VERBATIM que este fichero ya usaba
 * para TODO ancho antes de esta tarea) porque a partir de ahi sobra ancho
 * para pagarlo sin volver a rozar el suelo -- ver la tabla 320/375/599/600px
 * del informe de esta tarea para el valor exacto y el termino ganador del
 * `min()` exterior en cada punto.
 */
function storyStatementFontSize(): string {
  return `min(max(${STORY_STATEMENT_MIN_SIZE}, min(10.5vw, 19.2vh, ${STORY_STATEMENT_MAX_SIZE})), calc((100vw - var(--story-statement-pad) - var(--story-statement-pad)) / 12))`;
}

/*
 * Rama clara: contenedor de contenido normal (padding + tope de ancho,
 * centrado -- sin cambios respecto a la version anterior).
 *
 * Rama oscura ($fullBleed, spec 2026-07-31-story-deck-hero-transition-design.md
 * D15c, tercera iteracion): las dos entregas anteriores acotaban esta
 * seccion a una caja fija (primero a sangre, luego a `STORY_DARK_MAX_WIDTH` x
 * `STORY_DARK_HEIGHT`). Con la presentacion de 6 diapositivas esa caja fija
 * desaparece: `ScTrack` (story.deck.tsx) es quien mide 6 pantallas de alto
 * ahora, y `ScStory` vuelve a ser solo un contenedor relativo sin medida
 * propia, que crece con su contenido. Pierde su `overflow: hidden`: CUALQUIER
 * ancestro con overflow distinto de `visible`/`clip` rompe el
 * `position: sticky` del stage de mas abajo (D15c) -- el recorte del
 * overscan del parallax pasa a `ScStage`, que no es ancestro de si mismo.
 * `background-color` explicito (no solo heredado de `body`) porque, con el
 * stage escalandose durante la apertura/cierre de la presentacion, el borde
 * que asoma detras tiene que ser el mismo `secondary[1100]` del encargo
 * (D8), no lo que hubiera detras por casualidad.
 */
const ScStory = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          background-color: ${theme.data.semantic.bg};
        `
      : css`
          padding: ${theme.data.space[9]} ${theme.data.space[5]};
          max-width: ${theme.data.grid.navMax};
          margin-inline: auto;
        `}
`;

/*
 * Reveal de sección en CLARO (mismo patrón que `ScItem` en Features.tsx).
 * Duración/easing unificados (D7, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`):
 * `motion.duration.slower` (480ms) + `motion.easing.decelerate` en vez de
 * `duration.slow` (320ms) que llevaba antes -- mismo lenguaje de entrada que
 * `ScStepReveal` en Journey.tsx, que hasta esta entrega usaba la MISMA
 * duración pero `easing.emphasized`, sin ninguna razón documentada para la
 * divergencia entre las dos secciones.
 */
const ScGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  /* D11 (segunda ronda, 2026-08-06): stretch, NO center. SIN BACKTICKS en
     este comentario a proposito (vive dentro del template literal de
     styled-components, un backtick lo cierra y rompe el build -- leccion del
     repo, task/lessons.md 2026-07-25, reincidida el 2026-08-02). Medido en
     navegador antes de tocar nada: columna de la figura 548px, columna de
     contenido 863px. Con center la tarjeta de la figura quedaba flotando
     centrada y corta; con stretch (el valor por defecto de CSS Grid, que
     center estaba anulando) el item de la figura ocupa el alto COMPLETO de
     la fila del grid sin que nadie fije un numero. Solo tiene efecto visible
     desde el breakpoint lg (abajo), donde las dos columnas comparten fila --
     en columna unica cada item tiene su propia fila y no hay nada que
     estirar. */
  align-items: stretch;
  gap: ${({ theme }) => theme.data.space[7]};
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: minmax(280px, ${STORY_FIGURE_WIDTH}) 1fr;
    gap: ${({ theme }) => theme.data.space[8]};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

const ScFigureWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: min(${STORY_FIGURE_HEIGHT}, 70vh);
`;

const ScHalo = styled.div`
  position: absolute;
  inset: ${STORY_HALO_INSET};
  width: 100%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: ${STORY_HALO_GRADIENT};
  pointer-events: none;
`;

/*
 * Envoltorio del desplazamiento de scroll de la figura (D1, ver el docblock
 * de STORY_FIGURE_SCROLL_SHIFT en story.layers.ts para el porque no vive
 * directamente en ScFigureImg): un elemento DISTINTO al que ya anima
 * transform con @keyframes.
 *
 * El ancho se declara AQUI con la MISMA formula que antes llevaba
 * ScFigureImg (min(STORY_FIGURE_WIDTH, 100%)) y no se deja en "auto" -- este
 * div es el item de flex de ScFigureWrap ahora, y un item de flex con ancho
 * "auto" se dimensiona por shrink-to-fit de SU CONTENIDO; con el hijo
 * (ScFigureImg) declarando a su vez `width: 100%` contra ESTE envoltorio,
 * las dos reglas dependerian una de la otra (el envoltorio de su hijo, el
 * hijo de un envoltorio que todavia no tiene ancho resuelto). CSS resuelve
 * esa circularidad tratando el porcentaje del hijo como si el ancho del
 * padre fuera indefinido (CSS2.1 SS10.3.3: un porcentaje contra un
 * contenedor sin ancho explicito se trata como "auto"), lo que aqui
 * colapsaria la imagen -- la misma familia de fallo que ya documenta
 * task/lessons.md (2026-07-28, "Una altura porcentual del mockup presupone
 * el alto fijo de SU contenedor"), en el eje horizontal en vez del vertical.
 * Declarando la formula real aqui, el envoltorio tiene un ancho DEFINITIVO
 * (se resuelve contra ScFigureWrap, que a su vez lo tiene por el grid que lo
 * contiene) y el `width: 100%` del hijo deja de ser circular. El resultado
 * es la MISMA caja, pixel a pixel, que ocupaba ScFigureImg antes de este
 * envoltorio.
 */
const ScFigureShift = styled.div`
  width: min(${STORY_FIGURE_WIDTH}, 100%);
  transform: translateY(
    calc(${STORY_FIGURE_SCROLL_SHIFT} * var(--story-progress, 0))
  );

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScFigureImg = styled.img`
  position: relative;
  display: block;
  /* El ancho ya lo fija ScFigureShift (ver su docblock): aqui solo se llena
     ese envoltorio, ahora con un ancho definitivo, sin circularidad. */
  width: 100%;
  height: auto;
  aspect-ratio: ${STORY_FIGURE_ASPECT};
  /* GlobalStyles declara img { object-fit: cover } para todo el sitio; con
     la caja del mockup (375/548) sobre un arte 2:3, cover recortaria ~2.5%
     del alto (medido en navegador, revision 2026-07-28). contain no recorta
     nada y el margen sobrante es alfa puro, invisible. */
  object-fit: contain;
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} ${STORY_FIGURE_FLOAT_MS}ms ease-in-out infinite;
  }
`;

/*
 * AQUI VIVIERON ScNoteShift/ScNoteCard/ScSparkle (la tarjeta flotante de la
 * nota, con su desplazamiento de scroll propio y su icono). RETIRADOS en la
 * segunda ronda de esta entrega (D12, spec 2026-08-06): la nota
 * (`Home.story.note`) deja de ser una tarjeta flotante y pasa a ser el
 * statement a pantalla completa (`ScStatement`, mas abajo, tras
 * `StoryLight`). Sin consumidor, se retiran tambien sus constantes
 * exclusivas de story.layers.ts (`STORY_CARD_BG`/`STORY_CARD_BORDER`/
 * `STORY_CARD_SHADOW`/`STORY_CARD_FLOAT_MS`/`STORY_NOTE_SCROLL_SHIFT`) de la
 * lista de imports de este fichero -- siguen exportadas alli (fuera del
 * alcance de esta entrega, que solo toca Story.tsx/Story.test.tsx), pero ya
 * no las consume nadie.
 */

const ScContent = styled.div`
  display: flex;
  flex-direction: column;
`;

/* Kicker: mockup usa `var(--primary-600)` (L77). Se resuelve contra
   `semantic.brandText`, no contra un paso de palette -- mismo mapeo que ya
   aplica `ScKicker` en Hero.tsx para el mismo rol visual ("etiqueta de
   marca"). */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Segunda pieza de la cascada de D9 (retardo 80ms): mismo mecanismo que
   ScEyebrowRow -- ver su docblock, más arriba -- reutilizando el MISMO
   `data-revealed` de ScGrid. */
const ScTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  opacity: 0;
  transform: translateY(${STORY_REVEAL_TRANSLATE});
  transition:
    opacity ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard};
  transition-delay: ${STORY_REVEAL_DELAY_TITLE_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/* Degradado seleccionado por tema (spec 2026-07-29 D10): mismas paradas de
   hue, luminosidad mucho mayor en oscuro para que el background-clip:text
   siga siendo legible sobre el negro-violeta de StoryCosmicBeing. */
const ScAccent = styled.span`
  background-image: ${({ theme }) =>
    theme.data.isLight
      ? STORY_ACCENT_GRADIENT_LIGHT
      : STORY_ACCENT_GRADIENT_DARK};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  /* Red de seguridad: sin soporte de background-clip: text el degradado no
     puede quedar como único portador del color -- se degrada al rol de
     marca del tema (mismo recurso que gradientTextClip en BrandName.tsx). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }
`;

/* Tercera pieza de la cascada de D9 (retardo 140ms): mismo mecanismo que
   ScEyebrowRow/ScTitle -- ver el docblock de ScEyebrowRow, más arriba. */
const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  opacity: 0;
  transform: translateY(${STORY_REVEAL_TRANSLATE});
  transition:
    opacity ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard};
  transition-delay: ${STORY_REVEAL_DELAY_BODY_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * ScPillarRow/ScPillarNumber/ScPillarCopy: desde esta entrega (2026-08-06,
 * D2) YA NO los consume la rama clara -- los cuatro pilares pasaron de fila
 * de lista a tarjeta (`ScPillarCard`, más abajo). Se conservan intactos,
 * exclusivos de la rama OSCURA vía `ScDeckPillarRow` (regla D1 de la spec:
 * no tocar lo que consume el deck).
 */
const ScPillarRow = styled.div`
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: ${({ theme }) => theme.data.space[4]};
  align-items: baseline;
  padding-block: ${({ theme }) => theme.data.space[4]};
  border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

const ScPillarNumber = styled.span<{ $index: number }>`
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 700;
  color: ${({ $index }) => pillarColor($index)};
`;

const ScPillarCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
`;

/*
 * Barra + kicker (D4, "eyebrow"): SOLO rama clara -- envoltorio NUEVO, no
 * mutación de `ScKicker`, que la rama OSCURA reutiliza tal cual
 * (StoryDeckDark, más abajo, la sigue consumiendo directamente). La barra es
 * puramente decorativa (`aria-hidden`): puntuación visual, no contenido (D4).
 * Primera pieza de la cascada de D9 (retardo 0, ver
 * STORY_REVEAL_DELAY_EYEBROW_MS): arranca invisible y desplazada, y solo se
 * resuelve bajo el `data-revealed` que ya escribe el `useReveal` de
 * `ScGrid` -- ningún observer nuevo.
 */
const ScEyebrowRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  opacity: 0;
  transform: translateY(${STORY_REVEAL_TRANSLATE});
  transition:
    opacity ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard};
  transition-delay: ${STORY_REVEAL_DELAY_EYEBROW_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/* Barra (D4): 1.75rem x 2px del mockup (L75), sin paso de `space` que mida
   ninguna de las dos medidas -- literal documentado, como el resto de esta
   entrega. */
const ScEyebrowBar = styled.span`
  display: block;
  width: 1.75rem;
  height: 2px;
  background-color: ${({ theme }) => theme.data.semantic.brandText};
`;

/*
 * Rejilla de tarjetas (D2): sustituye a la antigua `ScPillars` (columna con
 * `border-block-start` por fila). `repeat(auto-fit, minmax(15rem, 1fr))`
 * mapea el `minmax(240px, 1fr)` del mockup (L85) al paso de `space` más
 * cercano por abajo que sigue dejando cuatro tarjetas legibles en una
 * columna estrecha.
 */
const ScPillarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: ${({ theme }) => theme.data.space[4]};
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

/*
 * Envoltorio de ENTRADA de cada tarjeta (D9): capa SEPARADA de
 * `ScPillarCard` (más abajo) por el mismo motivo que separa `ScItem`/
 * `ScCard` en Features.tsx -- si el `transition-delay` de la cascada de
 * entrada viviera en el MISMO elemento que anima `transform` en hover (D3),
 * cualquier hover posterior a la entrada heredaría ese mismo retardo (hasta
 * 380ms en la cuarta tarjeta) antes de reaccionar, porque `transition-delay`
 * se aplica a TODOS los cambios de esa propiedad en ese elemento, no solo al
 * primero. Con dos elementos, la entrada (aquí) y el hover (`ScPillarCard`)
 * no comparten `transition-delay`.
 *
 * `:nth-child` (D9, patrón `data-intro`/`nth-child` de `ScCopy` en
 * Hero.tsx), NO una prop `$index`: las CUATRO tarjetas son el MISMO
 * componente en el MISMO contenedor (`ScPillarGrid`), así que su posición ya
 * la da el DOM -- no hace falta que React se la pase por prop. El selector
 * es DESCENDIENTE (`[data-revealed="true"] &`), no `&[data-revealed="true"]
 * > &`, porque el atributo vive en `ScGrid` (un ANCESTRO, no el padre
 * directo) -- REUTILIZADO del `useReveal` que ya corre sobre ella (D9: "uno
 * solo, sobre el contenedor"), sin montar un segundo `IntersectionObserver`.
 */
const ScPillarCardItem = styled.div`
  opacity: 0;
  transform: translateY(${STORY_REVEAL_TRANSLATE});
  transition:
    opacity ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${STORY_REVEAL_DURATION_MS}ms
      ${({ theme }) => theme.data.motion.easing.standard};

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
  }

  [data-revealed="true"] &:nth-child(1) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[0]}ms;
  }
  [data-revealed="true"] &:nth-child(2) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[1]}ms;
  }
  [data-revealed="true"] &:nth-child(3) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[2]}ms;
  }
  [data-revealed="true"] &:nth-child(4) {
    transition-delay: ${STORY_CARD_REVEAL_DELAYS_MS[3]}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Superficie visible de la tarjeta (D2, tabla de mapeo mockup -> token) +
 * hover (D3). Componente NUEVO, no `ScPillarRow` mutado: la regla D1 de la
 * spec prohíbe tocar `ScPillarRow` (lo extiende `ScDeckPillarRow` en la rama
 * oscura) o levantar la geometría de tarjeta encima de ella.
 *
 * `box-shadow` en la transición de hover: excepción ya sancionada (D3, "el
 * mismo motivo que los tintes de estado", enmienda §9 del sistema de lujo),
 * acotada a hover, nunca ambiental.
 *
 * Task 9 (craft de interacción, punto 3 del brief): la duración del
 * hover-lift se UNIFICA de motion.duration.base (200ms) a PRESS.durationMs
 * (100ms) + PRESS.easing -- la misma entrada de transform pasa a gobernar
 * también el press de abajo (:active), y CSS no admite dos duraciones
 * distintas para una sola propiedad en la misma lista. box-shadow se queda
 * en duration.base/easing.standard, sin tocar -- solo se unifica el
 * hover-lift, no la sombra.
 */
const ScPillarCard = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.data.semantic.surface};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  padding: ${({ theme }) => theme.data.space[5]};
  transition:
    transform ${PRESS.durationMs}ms ${PRESS.easing},
    box-shadow ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  /* Guardado tras PRESS.hoverGuard (Task 9, punto 2 del brief): mueve
     (translateY), así que un tap en táctil no puede dejarlo "pegado". */
  @media ${PRESS.hoverGuard} {
    &:hover {
      transform: translateY(${STORY_CARD_HOVER_LIFT});
      box-shadow: ${({ theme }) => theme.data.elevation[1]};
    }
  }

  /* Press (Task 9): comparte la entrada de transform de la lista de arriba,
     así que entra y sale con PRESS.durationMs/PRESS.easing igual que el
     hover-lift. */
  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /* Mismo guard que ScCard (Card.tsx): bajo reduce se anula la transición Y
     el transform de hover/active (movimiento); el realce de box-shadow al
     pasar el puntero se conserva, ahora instantáneo -- no es motion, es la
     misma excepción ya documentada arriba. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;

const ScCardTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/**
 * Acento del BADGE, distinto del de `pillarColor` y por un motivo medido, no
 * estético.
 *
 * D2 de la spec pedía reutilizar `pillarColor` tal cual («no se introduce una
 * segunda escala de acentos»), y así se implementó primero. Al medir el
 * contraste que la propia spec exige en su §3 (el número sobre el fondo
 * `color-mix` del badge), **tres de los cuatro acentos no llegaban a AA**:
 *
 * | pilar | `pillarColor`      | sobre `surface` | sobre el `color-mix` 12% |
 * |-------|--------------------|-----------------|--------------------------|
 * | 01    | `primary[500]`     | 2.28:1          | 2.06:1                   |
 * | 02    | `secondary[500]`   | 2.76:1          | 2.45:1                   |
 * | 03    | `secondary[600]`   | 3.50:1          | 3.05:1                   |
 * | 04    | `secondary[700]`   | 5.92:1          | 4.98:1                   |
 *
 * Es decir: la spec se contradecía a sí misma, y gana §3 -- un requisito de
 * accesibilidad no cede ante una preferencia de reutilización. El propio
 * mockup ya lo resolvía igual: sus cuatro badges usan los pasos OSCUROS
 * (`--primary-700`, `--secondary-600`, `--secondary-700`, `--primary-600`),
 * no los claros, precisamente porque el número tiene que leerse.
 *
 * Esta función continúa esa misma rampa un paso más abajo hasta que las
 * CUATRO libran AA (los ratios reales los mide `Story.test.tsx`, contra los
 * tokens importados, nunca contra literales copiados aquí).
 *
 * `pillarColor` NO se toca: sigue siendo el acento de `ScPillarNumber`, que
 * es la pieza de la rama OSCURA (vía `ScDeckPillarRow`), donde el fondo es
 * otro y los ratios son otros.
 */
export function pillarBadgeAccent(
  palette: ThemeDefinition["palette"],
  index: number,
): string {
  if (index === 0) return palette.primary[800];
  if (index === 1) return palette.secondary[700];
  if (index === 2) return palette.secondary[800];
  return palette.secondary[900];
}

/* Se exporta `pillarBadgeAccent` (valor puro, sin `theme` de
   styled-components) y no este envoltorio: es lo que permite que
   `Story.test.tsx` MIDA el contraste real contra los mismos tokens que pinta
   el componente, en vez de repetir la tabla de acentos en el test -- una
   copia que se desincronizaría del código al primer retoque sin que nada
   fallara. */
function pillarBadgeColor(
  index: number,
): (props: { theme: DefaultTheme }) => string {
  return ({ theme }) => pillarBadgeAccent(theme.data.palette, index);
}

/*
 * Badge del número (D2 + §3): `color-mix` se resuelve a mano (no vía
 * interpolación anidada de styled-components) para poder usar el MISMO
 * acento resuelto tanto en `background-color` como en `color`, sin evaluarlo
 * dos veces con dos mecanismos distintos.
 */
const ScCardBadge = styled.span<{ $index: number }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: ${STORY_CARD_BADGE_SIZE};
  height: ${STORY_CARD_BADGE_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  font-family: ${({ theme }) => theme.data.type.fontMono};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: 700;
  letter-spacing: 0.04em;
  background-color: ${({ theme, $index }) =>
    `color-mix(in oklab, ${pillarBadgeColor($index)({ theme })} 12%, ${theme.data.semantic.surface})`};
  color: ${({ theme, $index }) => pillarBadgeColor($index)({ theme })};
`;

const ScCardStepLabel = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

const ScCardTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  font-weight: 700;
`;

const ScCardLead = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.text};
  font-weight: 600;
`;

const ScCardInspiration = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  line-height: ${STORY_CARD_INSPIRATION_LINE_HEIGHT};
`;

/*
 * El MISMO pilar, pero como diapositiva suelta de la rama OSCURA.
 * `ScPillarRow` ya no lo consume la rama clara desde esta entrega (2026-08-06,
 * D2: los pilares pasaron a tarjeta, ver `ScPillarCard` arriba); sigue
 * llevando `border-block-start` porque esa es su declaración de SIEMPRE, y
 * `ScDeckPillarRow` la anula aquí, en el único contexto que la consume, en
 * vez de retirarla de `ScPillarRow` -- no se toca esa declaración (D1: no
 * tocar lo que consume el deck), aunque ahora su único efecto práctico sea
 * quedar siempre anulada por esta extensión.
 */
const ScDeckPillarRow = styled(ScPillarRow)`
  border-block-start: none;
  padding-block: 0;
`;

/*
 * Statement a pantalla completa (D12): sustituye a la tarjeta flotante de
 * nota. Bloque NUEVO, HERMANO de `ScStory` y no un hijo suyo: el mockup lo
 * declara como dos <section> hermanos (L72/L127), y `StoryLight` los
 * devuelve igual, en un fragmento (ver su return, mas abajo).
 *
 * D13 (tercera ronda, 2026-08-06) partio este bloque UNICO en DOS piezas
 * (`ScStatementTrack`/`ScStatementStage`), calcado de como `ScTrack`/
 * `ScStage` cablean la presentacion oscura, para poder anclarlo con
 * `useSlideDeck`. D2 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md REVIERTE esa
 * particion: sin pista que recorrer ni pin que sostener, las dos piezas
 * vuelven a fundirse en un unico `ScStatement` -- la misma forma que tenia
 * en D12, antes de que D13 la partiera.
 *
 * `min-height: 100dvh`, NO `height`: el cartel conserva la presencia a
 * pantalla completa que el usuario aprobo en D12, pero deja de imponer una
 * altura fija -- si la frase creciera (traduccion mas larga, tipografia
 * mayor), el bloque crece con ella en vez de recortarla. Sin
 * `position: sticky` ni `top`: el documento pierde las ~300dvh de pista que
 * D13 anadia, y ninguna otra pieza media contra `#statement` (verificado por
 * grep, D2 de la spec). Sin guard de `reduce` propio para esta pieza: sin
 * pin ni pista no hay nada que degradar bajo reduce (D6) -- las tres lineas
 * siguen quedando visibles por su PROPIO guard (ver
 * ScStatementFirst/Second/Third, mas abajo).
 */
const ScStatement = styled.section`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding-block: ${({ theme }) => theme.data.space[8]};
  /* Mobile-first (Task 7, auditoria premium 2026-08-08): unica fuente del
     pad inline, leida tambien por storyStatementFontSize (su docblock, mas
     arriba, trae la desigualdad completa que fija el valor base) -- una
     custom property, no un valor de tema resuelto una vez en JS, porque
     necesita cambiar de valor segun el breakpoint SIN que la formula de
     tamano de fuente tenga que saber en cual esta: el navegador resuelve
     var() de nuevo en cada recalculo, con el valor que la cascada tenga
     vigente en ESE viewport. theme.data.space[4] (16px) hasta sm (600px);
     theme.data.space[6] (32px, el valor VERBATIM que esta seccion ya usaba
     para TODO ancho antes de esta tarea) desde ahi. */
  --story-statement-pad: ${({ theme }) => theme.data.space[4]};
  padding-inline: var(--story-statement-pad);

  @media ${({ theme }) => theme.data.breakPoint.sm} {
    --story-statement-pad: ${({ theme }) => theme.data.space[6]};
  }
`;

/*
 * El PARRAFO real (marcado obligatorio, D12): un lector de pantalla tiene
 * que leer la frase entera y seguida, no tres bloques sueltos -- de ahi que
 * las tres lineas vivan DENTRO de un unico <p>, no como hermanas directas de
 * `ScStatement`. El `gap` del mockup (L127: `clamp(4px, 1vh, 14px)`, entre
 * las tres lineas) se declara AQUI, no en `ScStatement`, precisamente porque
 * el envoltorio flex que agrupa las tres lineas es este <p>, no la seccion.
 *
 * D3 (spec 2026-08-07): este PARRAFO es tambien el nodo que observa
 * `useReveal` (ver StoryLight, mas abajo) -- no la seccion. `useReveal` usa
 * `threshold: 0.2`: sobre `ScStatement` (`min-height: 100dvh`) eso dispararia
 * con un 80% de bloque vacio todavia por delante, con el texto fuera de
 * pantalla; el parrafo ES el texto, asi que su interseccion al 20% coincide
 * con "se llego al elemento". El atributo `data-revealed` que escribe
 * `useReveal` vive por tanto AQUI, en el propio parrafo -- las tres lineas lo
 * leen con el selector descendiente `[data-revealed="true"] &` (ver
 * ScStatementFirst/Second/Third, mas abajo).
 */
const ScStatementText = styled.p`
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 1vh, 14px);
`;

/*
 * Las tres lineas comparten casi toda su declaracion (tipografia de cartel
 * fluida, mayusculas, `nowrap` acotado por `storyStatementFontSize`) y solo
 * difieren en color/transform-de-entrada (tabla D4 de la spec
 * 2026-08-07-story-statement-scroll-observer-design.md, VERBATIM de D12 --
 * esta entrega no toca ni una de estas declaraciones, solo QUIEN las
 * dispara). Se escriben TRES styled-components completos, no un mixin
 * compartido + variantes por prop: mismo criterio que
 * `ScEyebrowRow`/`ScTitle`/`ScBody`, mas arriba en este fichero, que ya
 * toleran la misma repeticion en vez de introducir una abstraccion nueva
 * para tres usos.
 *
 * D5 (spec 2026-08-07): `&[data-visible="true"]` (D13, tercera ronda
 * 2026-08-06 -- un selector SOBRE EL PROPIO elemento, porque `data-visible`
 * lo calculaba `StoryLight` LINEA A LINEA) se sustituye de vuelta por el
 * selector DESCENDIENTE `[data-revealed="true"] &`: el atributo vive ahora
 * en `ScStatementText`, el PARRAFO padre de las tres lineas (D3), no en cada
 * elemento -- NUNCA `&[data-revealed="true"]`, que evaluaria el atributo
 * sobre el propio elemento y no matchearia jamas (leccion §5.1 del manual
 * global, git `63c7fa9`). Mismo patron que `ScTitle`/`ScBody`/
 * `ScPillarCardItem`, mas arriba en este mismo fichero.
 *
 * La cascada (D9/D12) tambien vuelve, y su INVERSA es de verdad inversa
 * (D5): la regla `[data-revealed="true"] &` (estado visible) lleva el
 * retardo DIRECTO -- 1a linea 0ms, 2a 220ms, 3a 440ms. La regla BASE del
 * elemento (el estado que gana cuando `data-revealed` vuelve a "false")
 * lleva el retardo INVERSO -- 1a linea 440ms, 2a 220ms, 3a 0ms --
 * aprovechando que `transition-delay` se toma siempre del estado AL QUE se
 * transita: al retroceder, la frase se deshace empezando por la derecha (la
 * 3a linea, con 0ms, es la primera en desaparecer). En el montaje la regla
 * base ya lleva su retardo pero no hay transicion que correr (es el estilo
 * inicial, no un cambio) -- no produce ningun efecto observable.
 */
const ScStatementFirst = styled.span`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  white-space: nowrap;
  color: ${({ theme }) => theme.data.semantic.text};
  opacity: 0;
  transform: translateX(-16%);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la 1a linea es la ULTIMA en deshacerse al
     retroceder. */
  transition-delay: ${STORY_STATEMENT_DELAY_THIRD_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5): la 1a linea entra sin espera. */
    transition-delay: ${STORY_STATEMENT_DELAY_FIRST_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

const ScStatementSecond = styled.span`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  white-space: nowrap;
  color: ${({ theme }) => theme.data.semantic.brandText};
  opacity: 0;
  transform: scale(0.9);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la linea del medio, a mitad de camino tanto
     entrando como saliendo. */
  transition-delay: ${STORY_STATEMENT_DELAY_SECOND_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5). */
    transition-delay: ${STORY_STATEMENT_DELAY_SECOND_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

/*
 * Tercera linea: EXTIENDE `ScAccent` (no lo duplica) para heredar su
 * degradado de marca y su red de seguridad `@supports not (background-clip:
 * text)` tal cual (D12 de la spec: "el degradado de marca que ya usa
 * ScAccent en este mismo fichero -- reutilizalo"). Mismo recurso que
 * `ScDeckPillarRow`, arriba, para extender `ScPillarRow`.
 */
const ScStatementThird = styled(ScAccent)`
  display: block;
  font-size: ${storyStatementFontSize};
  font-weight: ${({ theme }) => theme.data.type.scale.h2.weight};
  line-height: ${STORY_STATEMENT_LINE_HEIGHT};
  letter-spacing: ${STORY_STATEMENT_LETTER_SPACING};
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(16%);
  transition:
    opacity ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING},
    transform ${STORY_STATEMENT_REVEAL_MS}ms ${STORY_STATEMENT_EASING};
  /* Retardo INVERSO (D5): la 3a linea es la PRIMERA en deshacerse al
     retroceder. */
  transition-delay: ${STORY_STATEMENT_DELAY_FIRST_MS}ms;

  [data-revealed="true"] & {
    opacity: 1;
    transform: none;
    /* Retardo DIRECTO (D5): la 3a linea es la ULTIMA en entrar. */
    transition-delay: ${STORY_STATEMENT_DELAY_THIRD_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transition-delay: 0ms;
    opacity: 1;
    transform: none;
  }
`;

export function Story(): ReactElement {
  const { themeName } = useTheme();

  // La rama clara vive en un componente HIJO aparte (StoryLight, justo
  // debajo) por el MISMO motivo que obliga a extraer StoryDeckDark unas
  // lineas mas abajo: useSectionProgress (D1, spec
  // 2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md)
  // llama a window.matchMedia sin condicion en su efecto de montaje (la
  // guarda reactiva de prefers-reduced-motion), exactamente igual que
  // useSlideDeck. Story() es UNA SOLA funcion para las dos ramas y las
  // reglas de los hooks de React prohiben llamar un hook solo "cuando el
  // tema es claro" dentro de ella -- el tema puede cambiar en caliente sin
  // desmontar Story, via el mismo ThemeProvider que ya fuerza la extraccion
  // de la rama oscura. Llamar useSectionProgress aqui rompería tambien los
  // tests claros existentes, ninguno de los cuales stubea matchMedia (nunca
  // lo necesitaron hasta esta entrega). Delegar cada rama a un componente
  // que solo se MONTA cuando le toca resuelve esto en las dos direcciones a
  // la vez: React nunca ejecuta los hooks de un componente que no se
  // renderiza.
  if (themeName === "light") {
    return <StoryLight />;
  }

  return <StoryDeckDark />;
}

/*
 * Rama clara de Story, extraida a su propio componente (ver el comentario de
 * mas arriba, en Story()): aqui SI es seguro llamar useSectionProgress sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama clara esta activa.
 */
function StoryLight(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  // Ref ESTABLE (useRef, no callback-ref): useSectionProgress escribe
  // --story-enter/--story-progress directamente sobre el propio elemento en
  // cada frame de rAF -- mismo motivo por el que useSlideDeck/useSceneParallax
  // exigen refs de identidad estable (ver trackRef/stageRef en
  // StoryDeckDark, mas abajo).
  const sectionRef = useRef<HTMLElement>(null);
  // cssVarPrefix "story" (D1): la rama OSCURA ya escribe --story-progress
  // con este mismo nombre, a traves de useSlideDeck (StoryDeckDark, mas
  // abajo) -- coincidencia deliberada, no un descuido: las dos ramas son
  // mutuamente excluyentes (nunca se montan a la vez) y la variable
  // significa lo mismo en las dos, "cuanto ha avanzado el scroll de esta
  // seccion por el viewport".
  useSectionProgress(sectionRef, { cssVarPrefix: "story" });
  // Statement a pantalla completa (D3, spec
  // 2026-08-07-story-statement-scroll-observer-design.md): el useSlideDeck
  // que llevaba esta pieza (D13, tercera ronda 2026-08-06 -- recorrido paso
  // a paso anclado por scroll) se sustituye por un useReveal PROPIO, un
  // SEGUNDO IntersectionObserver independiente del de ScGrid (arriba).
  // `once: false` es lo que entrega literalmente el requisito del encargo
  // ("cuando se realice scroll hacia arriba, las animaciones se realiza a la
  // inversa"): revealed vuelve a false cuando el nodo deja de intersecar, y
  // el CSS vuelve solo a su estado base -- el once: true por defecto haria
  // el efecto irreversible. Se observa el PARRAFO (ScStatementText,
  // HTMLParagraphElement), no la seccion: threshold: 0.2 (el defecto de
  // useReveal) sobre una seccion de min-height: 100dvh dispararia con el
  // texto todavia fuera de pantalla; el parrafo ES el texto, asi que su
  // interseccion al 20% coincide con "se llego al elemento". Nombres propios
  // (statementRef/statementRevealed) para no chocar con revealRef/revealed,
  // el useReveal de ScGrid, arriba.
  const { ref: statementRef, revealed: statementRevealed } =
    useReveal<HTMLParagraphElement>({ once: false });

  const pillars = (
    <ScPillarGrid>
      {PILLARS.map((pillar, index) => (
        <ScPillarCardItem key={pillar.key}>
          <ScPillarCard>
            <ScCardTopRow>
              {/* Decorativo (D10): el orden ya lo da el DOM: un lector de
                  pantalla que anuncie "cero uno" antes del titulo anade
                  ruido sin informacion. */}
              <ScCardBadge
                $index={index}
                aria-hidden="true"
              >
                {pillar.number}
              </ScCardBadge>
              <ScCardStepLabel variant="overline">
                {t("Home.story.stepLabel")}
              </ScCardStepLabel>
            </ScCardTopRow>
            {/* forwardedAs="p", NO as="p" (gotcha documentado en
                Typography.tsx/Hero.tsx:358 -- con `as` en un
                `styled(Typography)` el wrapper consume el prop, renderiza un
                <p> pelado y descarta Typography entero): el h2#story-title
                sigue siendo el unico encabezado accesible de la seccion en
                claro, mismo criterio que ya aplicaba el titulo de fila
                anterior. */}
            <ScCardTitle
              variant="h5"
              forwardedAs="p"
            >
              {t(`Home.story.pillars.${pillar.key}.title`)}
            </ScCardTitle>
            <ScCardLead variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.body`)}
            </ScCardLead>
            <ScCardInspiration variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.inspiration`)}
            </ScCardInspiration>
          </ScPillarCard>
        </ScPillarCardItem>
      ))}
    </ScPillarGrid>
  );

  const heading = (
    <>
      <ScEyebrowRow>
        <ScEyebrowBar aria-hidden="true" />
        <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
      </ScEyebrowRow>
      <ScTitle
        variant="h2"
        id="story-title"
      >
        {t("Home.story.titleLead")}
        <br />
        <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
      </ScTitle>
      <ScBody variant="body">{t("Home.story.body")}</ScBody>
    </>
  );

  return (
    <>
      <ScStory
        ref={sectionRef}
        id="story"
        aria-labelledby="story-title"
        $fullBleed={false}
      >
        <ScGrid
          ref={revealRef}
          data-revealed={revealed}
        >
          <ScFigureWrap>
            <ScHalo aria-hidden="true" />
            {/* ScFigureShift: envoltorio del desplazamiento de scroll de la
                figura (D1) -- ver su docblock, mas arriba, para el porque
                (conflicto @keyframes/transform). */}
            <ScFigureShift>
              <ScFigureImg
                src="/figures/journey-presenting-1024.webp"
                srcSet="/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w"
                sizes={STORY_FIGURE_SIZES}
                alt={t("Home.story.figureAlt")}
                loading="lazy"
                decoding="async"
              />
            </ScFigureShift>
          </ScFigureWrap>

          <ScContent>
            {heading}
            {pillars}
          </ScContent>
        </ScGrid>
      </ScStory>

      {/* Statement a pantalla completa (D12; D2/D3 de la spec
          2026-08-07-story-statement-scroll-observer-design.md): HERMANO de
          ScStory, no un hijo suyo -- ver el docblock de ScStatement, mas
          arriba, para el porque. Un solo <p> con las tres lineas como <span>
          en bloque (marcado obligatorio, D12): un lector de pantalla lee la
          frase entera y seguida, "Cada idea puede ser un nuevo comienzo", en
          vez de tres fragmentos sueltos. El PARRAFO lleva el `ref`/
          `data-revealed` de useReveal (D3): las tres lineas ya no calculan
          nada linea a linea (el `data-visible` de D13 queda revertido),
          solo reaccionan al atributo del PADRE por CSS puro, selector
          descendiente (ver el docblock de
          ScStatementFirst/Second/Third, mas arriba). */}
      <ScStatement id="statement">
        <ScStatementText
          ref={statementRef}
          data-revealed={statementRevealed}
        >
          <ScStatementFirst>{t("Home.story.statement.first")}</ScStatementFirst>{" "}
          <ScStatementSecond>
            {t("Home.story.statement.second")}
          </ScStatementSecond>{" "}
          <ScStatementThird>{t("Home.story.statement.third")}</ScStatementThird>
        </ScStatementText>
      </ScStatement>
    </>
  );
}

/*
 * Rama oscura de Story, extraida a su propio componente (ver el comentario
 * de mas arriba, en Story()): aqui SI es seguro llamar useSlideDeck sin
 * condicion, porque este componente en si mismo solo se monta cuando la
 * rama oscura esta activa.
 *
 * YA NO recibe `heading` por prop (spec 2026-07-31-story-deck-tipografia-design.md,
 * Task 2): antes se construia UNA vez en Story() y lo consumian las dos
 * ramas -- la clara directamente, la oscura por prop, el MISMO nodo en las
 * dos. Con la escala tipografica de cartel de esta entrega (h2 hasta 4rem)
 * eso deja de ser seguro: cualquier cambio de tamano sobre ese nodo
 * compartido se habria filtrado tambien al tema claro. Por eso este
 * componente compone su PROPIO kicker/h2/body con los styled de
 * story.deck.tsx (`ScDeckTitle`/`ScDeckIntroBody`), mientras Story()
 * conserva `heading` (con `ScKicker`/`ScTitle`/`ScAccent`/`ScBody`) intacto,
 * exclusivo de la rama clara. `ScKicker`/`ScAccent` SI se reutilizan tal
 * cual (no cambian de tamano en este encargo, no hay riesgo de fuga). El
 * resto (pilares, nota, rail, anclas de snap) ya se construia aqui con su
 * PROPIO `t`, mismo namespace/instancia de i18n que Story().
 */
function StoryDeckDark(): ReactElement {
  const { t } = useTranslation("home");

  // Refs ESTABLES (useRef, no callback-ref): useSlideDeck lee
  // getBoundingClientRect() de la pista en cada frame de rAF y escribe las
  // variables CSS de la coreografia directamente sobre el stage -- mismo
  // motivo por el que useSceneParallax exige refs de identidad estable en
  // vez de callbacks (StoryCosmicBeing.tsx).
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // cssVarPrefix: "story" EXPLICITO (D4, spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md): el hook ya generaliza
  // a cualquier presentacion de N diapositivas y su defecto es "deck", asi
  // que sin este parametro escribiria `--deck-enter`/`--deck-progress` sobre
  // el stage -- variables que `story.deck.tsx` no consume. Pasando "story"
  // explicitamente el hook sigue escribiendo `--story-enter`/
  // `--story-progress`, EXACTAMENTE lo que ese fichero ya lee: el
  // renombrado del hook no mueve ni una linea de CSS en esta seccion.
  const { index, direction } = useSlideDeck(trackRef, stageRef, STORY_SLIDES, {
    tailScreens: STORY_DECK_TAIL_SCREENS,
    cssVarPrefix: "story",
  });

  // Estado de cada diapositiva (spec seccion 5b): se decide AQUI, comparando
  // su indice con el `index` que escribe el hook -- el CSS de ScSlide
  // (story.deck.tsx) solo reacciona al atributo `data-state` resultante,
  // nunca calcula nada por si mismo (jsdom, ademas, no puede evaluar ningun
  // calculo que dependiera de scroll real).
  const slideState = (slideIndex: number): "past" | "current" | "next" => {
    if (slideIndex < index) return "past";
    if (slideIndex === index) return "current";
    return "next";
  };

  return (
    <ScStory
      id="story"
      aria-labelledby="story-title"
      $fullBleed
    >
      {/* ScTrack da a la pagina el recorrido de scroll de las 6
          diapositivas (6 * STORY_DARK_HEIGHT); ScStage, su unico hijo en
          flujo, es quien se pega y permanece en pantalla mientras ese
          recorrido pasa por debajo (spec seccion 4). */}
      <ScTrack ref={trackRef}>
        <ScStage
          ref={stageRef}
          data-slide={index}
          data-dir={direction}
        >
          <ScSceneWrap>
            <StoryCosmicBeing />
          </ScSceneWrap>
          <ScDeck>
            <ScSlide
              data-slide-index={0}
              data-state={slideState(0)}
            >
              <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
              <ScDeckTitle id="story-title">
                {t("Home.story.titleLead")}
                <br />
                <ScAccent>{t("Home.story.titleAccent")}</ScAccent>
              </ScDeckTitle>
              <ScDeckIntroBody>{t("Home.story.body")}</ScDeckIntroBody>
            </ScSlide>
            {PILLARS.map((pillar, pillarIndex) => (
              <ScSlide
                key={pillar.key}
                data-slide-index={pillarIndex + 1}
                data-state={slideState(pillarIndex + 1)}
              >
                <ScDeckPillarRow>
                  <ScPillarNumber $index={pillarIndex}>
                    {pillar.number}
                  </ScPillarNumber>
                  <ScPillarCopy>
                    <ScDeckPillarTitle>
                      {t(`Home.story.pillars.${pillar.key}.title`)}
                    </ScDeckPillarTitle>
                    {/* Rol de SUBTITULO (T2 de la spec): el texto que hoy
                        vive en `pillars.<key>.body`, sin renombrar la
                        clave -- solo cambia el rol en el que se pinta. */}
                    <ScDeckPillarSubtitle>
                      {t(`Home.story.pillars.${pillar.key}.body`)}
                    </ScDeckPillarSubtitle>
                    <ScDeckPillarBody>
                      {t(`Home.story.pillars.${pillar.key}.inspiration`)}
                    </ScDeckPillarBody>
                  </ScPillarCopy>
                </ScDeckPillarRow>
              </ScSlide>
            ))}
            <ScSlide
              data-slide-index={STORY_SLIDES - 1}
              data-state={slideState(STORY_SLIDES - 1)}
            >
              {/* Nota partida en noteLead + noteAccent (T3 de la spec
                  2026-07-31-story-deck-tipografia-design.md): claves
                  EXCLUSIVAS de esta rama oscura, no tocadas por D12 (segunda
                  ronda, 2026-08-06) -- la rama clara ya no consume `note` en
                  absoluto, consume `Home.story.statement.*` en su propio
                  bloque a pantalla completa (ScStatement, mas arriba). */}
              <ScDeckNote>
                {t("Home.story.noteLead")}{" "}
                <ScDeckNoteAccent>
                  {t("Home.story.noteAccent")}
                </ScDeckNoteAccent>
              </ScDeckNote>
            </ScSlide>
          </ScDeck>
          {/* Rail decorativo (D13): 6 marcas, aria-hidden, que reflejan
              data-slide del stage por CSS puro (ScRailMark, story.deck.tsx) --
              no llevan estado propio de React, solo su indice fijo. */}
          <ScRail aria-hidden="true">
            {Array.from({ length: STORY_SLIDES }, (_, railIndex) => (
              <ScRailMark
                key={railIndex}
                $index={railIndex}
              />
            ))}
          </ScRail>
        </ScStage>
      </ScTrack>
    </ScStory>
  );
}
