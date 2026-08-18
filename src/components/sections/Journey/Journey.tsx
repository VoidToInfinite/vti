"use client";

import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useSlideDeck } from "@/hooks/useSlideDeck";
import { REVEAL } from "@/motion/vocabulary";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { JourneyCosmicPortal } from "@/components/scenes/journeyCosmicPortal/JourneyCosmicPortal";
import {
  ScJourneyDeck,
  ScJourneyDeckTitle,
  ScJourneyIntroBody,
  ScJourneyQuote,
  ScJourneyRail,
  ScJourneyRailMark,
  ScJourneyScrollHint,
  ScJourneySceneWrap,
  ScJourneySlide,
  ScJourneyStage,
  ScJourneyStepIconBox,
  ScJourneyStepLabel,
  ScJourneyStepSubtitle,
  ScJourneyTrack,
} from "./journey.deck";
import {
  JOURNEY_STEPS,
  JOURNEY_CARD_BACKGROUND,
  JOURNEY_FIGURE_SCROLL_SHIFT,
  JOURNEY_PATH_VIEWBOX,
  JOURNEY_PATH_D,
  JOURNEY_PATH_SCROLL_SHIFT,
  JOURNEY_PATH_STROKE,
  JOURNEY_FIGURE_SHADOW,
  JOURNEY_FIGURE_WIDTH,
  JOURNEY_FIGURE_SIZES,
  JOURNEY_FIGURE_SRC,
  JOURNEY_FIGURE_SRC_SMALL,
  JOURNEY_OVERLAY_RISE,
  JOURNEY_SLIDES,
  JOURNEY_DECK_TAIL_SCREENS,
  type JourneyStep,
  type JourneyStepId,
} from "./journey.layers";

/*
 * Rama OSCURA (2026-08-02, spec
 * `docs/superpowers/specs/2026-08-02-journey-deck-8-diapositivas-design.md`,
 * MISMA TECNICA que Story: `Story.tsx`/`story.deck.tsx`, su referencia
 * obligatoria). Journey pasa de ser una unica pantalla (entrega anterior del
 * mismo dia, `2026-08-02-journey-overlay-transition-design.md`) a una
 * presentacion de `JOURNEY_SLIDES` diapositivas ancladas por scroll (1 intro
 * + 6 pasos + 1 cita), pegada por `position: sticky` sobre una pista alta --
 * ver `journey.deck.tsx` para la estructura estructural completa. La entrada
 * a la presentacion sigue siendo el solape sobre Story de la entrega
 * anterior (`margin-block-start` negativo, `ScJourney` mas abajo): esta spec
 * no toca esa mecanica, solo lo que hay DENTRO de la seccion una vez que el
 * solape la trae a pantalla.
 *
 * Rama CLARA: tarjeta pastel + camino punteado + rejilla de 6 columnas +
 * figura en columna propia.
 *
 * PARIDAD DE CONTENIDO entre las dos ramas (Task 16, unificacion parte 2,
 * 2026-08-11): las dos cuentan lo mismo -- mismo h2, mismo cuerpo, los
 * MISMOS 6 pasos con su etiqueta y su subtitulo, y la misma cita de cierre
 * -- con arte y vehiculo distintos (rejilla + camino punteado en claro,
 * presentacion de diapositivas ancladas en oscuro).
 *
 * LA NUMERACION es la excepcion sancionada, y conviene saber por que antes
 * de "arreglarla": la rama clara rotula "0N · Etiqueta" y la oscura NO
 * muestra ningun numero. No es un descuido -- al dueno se le pregunto
 * explicitamente por esta asimetria el 2026-08-02 y respondio "solo la rama
 * oscura" (D16 de
 * docs/superpowers/specs/2026-08-02-journey-deck-8-diapositivas-design.md),
 * y lo reconfirmo el 2026-08-11 cuando esta tarea propuso igualarlas.
 *
 * Lo que SI cambio en esa segunda vuelta es la accesibilidad: el rail de
 * progreso del deck es `aria-hidden`, asi que en la rama oscura no habia
 * NINGUNA senal de posicion para quien navega con lector de pantalla. La
 * diapositiva de paso lleva ahora un `VisuallyHidden` ("Paso N de 6",
 * `Home.journey.stepPosition`) delante de la etiqueta: se anuncia, no se ve,
 * y la decision visual del dueno queda intacta. En el DOM va tras la caja
 * del icono, que es `aria-hidden` y no aporta texto, asi que para un lector
 * de pantalla ES lo primero que suena de la diapositiva.
 */

/** Paso entre pasos del reveal escalonado (mismo mecanismo que `ScItem` en
 *  `Features.tsx`, spec §7.2: "~90ms por paso"). Solo lo consume la rama
 *  clara -- la oscura, al ser una presentacion de diapositivas, no tiene
 *  reveal escalonado propio (cada diapositiva entra entera con el mismo
 *  mecanismo de `ScJourneySlide`). */
const STEP_STAGGER_MS = 90;

/**
 * Ordinal visible de un paso ("01".."06"), a partir de su indice en
 * `JOURNEY_STEPS`. Un solo consumidor: `ScStepLabel`, la rama CLARA, que lo
 * pinta pegado a la etiqueta con su separador. La rama oscura no muestra
 * numero (decision del dueno, ver el docblock de cabecera); su senal de
 * posicion es texto para lector de pantalla y se compone aparte, con
 * palabras ("Paso N de 6"), no con este formato de dos digitos.
 *
 * Sigue siendo una funcion y no un literal en el JSX porque el formato
 * -- dos digitos con cero a la izquierda -- es una decision, y tenerla con
 * nombre es lo que hace evidente en la revision si alguna vez diverge.
 *
 * El ordinal NO vive en `JOURNEY_STEPS` (journey.layers.ts) a proposito: es
 * la POSICION del paso en el array, no un dato propio del paso. Duplicarlo
 * como campo abriria la puerta a que el dato y el orden real se
 * contradigan.
 */
function stepOrdinal(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Separador entre ordinal y etiqueta en la rama CLARA ("01 · Descubre",
 *  verbatim del mockup aprobado). Es tipografia de ESA composicion, no
 *  contenido: la rama oscura pinta el mismo ordinal en linea propia, sin
 *  separador, porque no hay nada de lo que separarlo. */
const STEP_ORDINAL_SEPARATOR = " · ";

/*
 * Rama clara: contenedor normal (padding + tope de ancho, centrado -- sin
 * cambios).
 *
 * Rama oscura ($fullBleed, D2/D7, spec
 * `2026-08-02-journey-deck-8-diapositivas-design.md`): la seccion deja de
 * tener caja propia -- pierde `min-height`, `display: grid` y
 * `place-items: center` -- porque ahora es `ScJourneyTrack`
 * (`journey.deck.tsx`) quien mide `JOURNEY_SLIDES` pantallas de alto, MISMO
 * reparto que `ScStory` en `Story.tsx` tras convertirse en presentacion
 * (D15c de su propia spec): un contenedor relativo sin medida propia, que
 * crece con su contenido.
 *
 * PIERDE `overflow: hidden` (D7): es EL FALLO QUE ROMPERIA EL PIN ENTERO EN
 * SILENCIO, sin ningun error en consola que lo delate. Cualquier ancestro
 * con `overflow` distinto de `visible`/`clip` desactiva el
 * `position: sticky` de un descendiente -- el MISMO precedente D15b/D15c de
 * `story.deck.tsx`, ya pagado una vez en Story, que aqui se evita de raiz en
 * vez de repetirse: si `ScJourney` conservara su `overflow: hidden`, el
 * `stage` de `ScJourneyStage` (`journey.deck.tsx`) no engancharia y la
 * presentacion entera degradaria a scroll normal. El recorte del overscan de
 * la escena pasa a `ScJourneyStage`, que no es ancestro de si mismo.
 *
 * CONSERVA `position: relative`, `z-index: 1` (para seguir pintando por
 * encima de Story, D11 de la spec anterior), `background-color` explicito
 * (el borde que asoma detras del stage tiene que ser `secondary[1100]`, no
 * lo que hubiera por casualidad) y el solape `margin-block-start` negativo
 * con su guard de `reduce` -- mecanica intacta de las dos entregas
 * anteriores (D2/D5/D6, `2026-08-02-journey-overlay-transition-design.md`),
 * que esta spec no toca.
 */
const ScJourney = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          z-index: 1;
          background-color: ${theme.data.semantic.bg};
          margin-block-start: calc(-1 * ${JOURNEY_OVERLAY_RISE});

          @media (prefers-reduced-motion: reduce) {
            margin-block-start: 0;
          }
        `
      : css`
          max-width: ${theme.data.grid.navMax};
          margin-inline: auto;
          padding: ${theme.data.space[8]} ${theme.data.space[6]};

          /* RECORTE DE LA FRONTERA statement -> Journey en MOVIL (critica
             externa #10, hallazgo B2, 2026-08-18). Medido a 390x844 en tema
             claro, y=3421: 290 px de banda vacia (34 % del viewport) entre el
             enlace de Discord que cierra Story y el borde superior de la
             tarjeta de Journey.

             ARITMETICA DE LA BANDA, reproducida desde la fuente (el modelo da
             289,9 px frente a los 290 medidos, asi que describe el hueco
             real, no una hipotesis):

               ScStatement (Story.tsx) mide min-height 70dvh = 590,8 px con
               padding-block space[8] (64 px por lado) y su contenido -- unos
               139 px de texto mas el enlace -- centrado con
               justify-content center.
                 hueco bajo el enlace = (590,8 - 128 - 139) / 2 = 161,9 px
                 + padding-block-end de ScStatement                =  64,0 px
                 + padding-block-start de ESTA seccion             =  64,0 px
                                                                    ---------
                                                                     289,9 px

             POR QUE SOLO SE RECORTA ESTE TERMINO: los otros dos son de Story
             y no responden como parece. Con min-height mandando (590,8 muy
             por encima de 128 + 139), recortar el padding de ScStatement
             AGRANDA su caja de contenido y el centrado se traga la mitad del
             recorte -- bajarlo de 64 a 32 px devolveria 16 px, no 32. Es el
             mismo mecanismo que la Ola B (2026-08-16) ya midio en el otro
             extremo de esa seccion y dejo escrito en el docblock de ScStory.
             El padding-block-start de aqui, en cambio, es 100 % efectivo: no
             hay ningun centrado que lo absorba.

             ANTES 64 px  ->  DESPUES 16 px (space[4]), banda 290 -> 242 px
             (34,3 % -> 28,7 % del viewport de 844). La tarjeta ya aporta sus
             propios 48 px de relleno interior (ScCard), asi que sobre el h2
             quedan 64 px de aire, no 16.

             SOLO POR DEBAJO DE md: la critica midio el defecto en movil y a
             partir de 768 px el relleno original vuelve intacto -- no se
             toca una composicion que nadie ha medido rota.

             LO QUE NO CIERRA ESTE RECORTE, declarado y no disimulado: los
             226 px restantes son el centrado de ScStatement dentro de sus
             70dvh. Esa altura es una decision de diseno del dueno (Ola B,
             2026-08-16) tomada midiendo a 1440x900, nunca re-medida a
             390x844; cambiarla es rediseno de Story, no espaciado de
             frontera.

             SIN BACKTICKS: esto vive dentro de un template literal css de
             styled-components (task/lessons.md 2026-07-25 y 2026-08-16). */
          padding-block-start: ${theme.data.space[4]};

          @media ${theme.data.breakPoint.md} {
            padding-block-start: ${theme.data.space[8]};
          }
        `}
`;

const ScCard = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  background: ${JOURNEY_CARD_BACKGROUND};
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.space[7]} ${({ theme }) => theme.data.space[8]};
`;

const ScHeader = styled.div`
  text-align: center;
  /* Medida propia de la cabecera (mockup: max-width 640px), no un valor
     de la escala 'grid' (que no tiene un tramo cercano a este ancho). */
  max-width: 640px;
  margin-inline: auto;
`;

/*
 * Entradilla de la cabecera de Journey (`Home.journey.body`).
 *
 * `max-width` (crítica externa #9, 2026-08-17): NUEVO. Hasta hoy este párrafo
 * era el único cuerpo de texto de la home sin tope de ancho propio -- heredaba
 * los 640px de `ScHeader` y el evaluador lo midió en runtime a **99,2
 * caracteres reales por línea**, un 32% por encima del techo del rango 60-75
 * que el propio sistema declara (`DESIGN.md` §3.4). No era riesgo latente como
 * en el resto de piezas que la Task 22 tapó: era un defecto visible con el
 * copy de hoy.
 *
 * POR QUÉ EL CAP VA AQUÍ Y NO EN `ScHeader`: es el criterio que ya siguen las
 * otras tres secciones -- `ScIntro`/`ScBody`/`ScDarkBody` en `Features.tsx`,
 * `ScBody` en `Story.tsx`, `ScJourneyIntroBody`/`ScJourneyStepSubtitle` en
 * `journey.deck.tsx` -- todas declaran la medida de lectura sobre el PÁRRAFO,
 * nunca sobre el contenedor. Mover el tope a `ScHeader` habría arrastrado
 * también al `h2`, que no es prosa y cuya medida (los 640px del mockup, ver su
 * comentario) es una decisión de composición distinta.
 *
 * `margin-inline: auto` acompaña al tope porque `ScHeader` centra
 * (`text-align: center` + `margin-inline: auto`): sin él, la caja del párrafo
 * -- ya más estrecha que su contenedor -- quedaría pegada al borde izquierdo y
 * el texto centrado dentro de ella se leería descolgado del titular. Mismo par
 * de declaraciones que `ScMain` en `NotFoundContent.tsx`, el otro bloque
 * centrado del sitio que topa en esta medida.
 */
const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
  margin-inline: auto;
`;

/*
 * Fix 2026-07-28: la figura se posicionaba en absoluto sobre TODO el ancho
 * de la tarjeta con un `top`/`right` medidos a mano contra el mockup, sin
 * reservar hueco propio -- en cuanto el contenido real (traducciones de
 * distinto largo, viewport real) no coincidia exactamente con esas cifras,
 * la figura se montaba encima del camino punteado y de los discos.
 *
 * Arreglo de raiz, no un reajuste de pixeles: este contenedor envuelve el
 * camino+rejilla de pasos Y la cita, y reserva el ancho de la figura (+ un
 * hueco) como `padding-inline-end` SOLO >= xl (donde la figura se muestra).
 * El camino (`width: 100%` de ESTE contenedor) y la rejilla de pasos NUNCA
 * se extienden bajo la figura -- por construccion del layout, no por
 * coincidencia de coordenadas. Es tambien el ancestro `position: relative`
 * de la figura (ver ScFigure): con `height: 100%` + `object-fit: contain`
 * dentro de esa columna reservada, la figura entra siempre completa, se
 * reduzca lo que se reduzca su alto disponible.
 */
const ScStepsAndQuote = styled.div`
  position: relative;

  @media ${({ theme }) => theme.data.breakPoint.xl} {
    padding-inline-end: calc(
      ${JOURNEY_FIGURE_WIDTH} + ${({ theme }) => theme.data.space[5]} - 115px
    );
    height: 200px;
  }
`;

const ScStepsRow = styled.div`
  position: relative;
  margin-top: ${({ theme }) => theme.data.space[6]};
  padding-bottom: ${({ theme }) => theme.data.space[4]};
`;

/*
 * Desplazamiento de scroll (D1, ver el docblock de JOURNEY_PATH_SCROLL_SHIFT
 * en journey.layers.ts): directo en este elemento, sin envoltorio -- ScPath
 * no anima transform con @keyframes en ningún otro punto, así que no hay
 * ninguna propiedad que disputarle a una animación existente.
 */
const ScPath = styled.svg`
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 96px;
  transform: translateY(
    calc(${JOURNEY_PATH_SCROLL_SHIFT} * var(--journey-progress, 0))
  );

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

const ScStepsGrid = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.data.space[5]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(3, 1fr);
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    grid-template-columns: repeat(6, 1fr);
    gap: ${({ theme }) => theme.data.space[2]};
  }
`;

/*
 * Escalonado de reveal (opacity/transform), separado del offset de layout
 * (`ScStepOffset`, más abajo) para que los dos `transform` de este paso
 * vivan en elementos DISTINTOS y no se pisen entre sí — el mismo motivo por
 * el que `ScItem`/tarjeta están separados en `Features.tsx`.
 *
 * Duración/easing unificados (D7, spec
 * `2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md`):
 * `motion.duration.slower` (480ms) + `motion.easing.decelerate` en vez de
 * `easing.emphasized` que llevaba antes -- mismo lenguaje de entrada que
 * `ScGrid` en Story.tsx, sin ninguna razón documentada para la divergencia
 * previa entre las dos secciones. El escalonado por índice (`transition-
 * delay`, siguiente línea) y su guard de `reduce` (más abajo, que también
 * anula el delay) NO cambian: siguen siendo la parte de este bloque que sí
 * distingue a Journey de Story.
 *
 * Curva migrada a `REVEAL.easing` (fix wave D, hallazgo D3, revisión final de
 * rama, 2026-08-12): hasta esta revisión seguía en `motion.easing.decelerate`
 * suelto pese a que Task 19 ya había migrado el mismo patrón en Story.tsx/
 * Features.tsx a la curva PROPIA de `REVEAL` (`cubic-bezier(0.23, 1, 0.32,
 * 1)`, distinta de `decelerate`) -- dos curvas de reveal convivían en la
 * misma página. `REVEAL.durationMs` sustituye también a
 * `theme.data.motion.duration.slower` (mismos 480ms, ahora por el token). El
 * `translateY(12px)` NO se toca: es un desvío de composición ya documentado
 * (ver el docblock de `REVEAL` en `src/motion/vocabulary.ts`), no parte del
 * hallazgo D3 (que pedía la curva, no el desplazamiento). Verificado en
 * navegador real que el cambio de curva no altera el carácter del
 * movimiento (capturas `fixD-*` del informe de la tarea).
 */
const ScStepReveal = styled.div<{ $index: number }>`
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity ${REVEAL.durationMs}ms ${REVEAL.easing},
    transform ${REVEAL.durationMs}ms ${REVEAL.easing};
  transition-delay: ${({ $index }) => $index * STEP_STAGGER_MS}ms;

  &[data-revealed="true"] {
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

/* Offset vertical alterno del mockup (L114-143): layout puro, sin
   transition, y solo ≥ `lg` (spec §7.2: "< lg... sin offsets"). */
const ScStepOffset = styled.div<{ $offsetY: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    transform: translateY(${({ $offsetY }) => $offsetY}px);
  }
`;

/** Resuelve el color de un paso contra la rampa del tema (mockup:
 *  `var(--<ramp>-<paso>)`, ver docblock de `journey.layers.ts`). */
function stepColor(
  theme: ThemeDefinition,
  step: Pick<JourneyStep, "colorRamp" | "colorStep">,
): string {
  return theme.palette[step.colorRamp][step.colorStep];
}

/**
 * Escalón AA-seguro de la rampa, para TEXTO en tema claro (fix wave E,
 * hallazgo E2 -- evaluador de navegador real, 2026-08-13). `ScStepLabel`
 * pintaba `stepColor(...)` directo -- el MISMO escalón de rampa
 * (`step.colorStep`, `journey.layers.ts`) que también usa el icono del
 * disco (`ScDisc`) -- sobre el fondo pastel translúcido de `ScCard`
 * (`JOURNEY_CARD_BACKGROUND`, compuesto sobre `semantic.bg`). Medido con
 * `contrastRatio`/píxel real contra los SEIS fondos que pinta el
 * degradado a 135deg de la tarjeta detrás de cada etiqueta:
 *
 *   01 Descubre   (primary/500)    2.05:1  incumple 4.5:1
 *   02 Aprende    (primary/600)    2.72:1  incumple
 *   03 Imagina    (secondary/500)  2.49:1  incumple
 *   04 Crea       (secondary/600)  3.18:1  incumple
 *   05 Comparte   (secondary/700)  5.36:1  ya cumplía
 *   06 Evoluciona (error/500)      2.82:1  incumple
 *
 * MISMA FAMILIA que Task 33 (`languageAccent`, `LanguageSelector.tsx`) y fix
 * wave A hallazgo A4 (`navActiveAccent`, `NavSheet.tsx`): un acento de marca
 * tomado DIRECTAMENTE de `palette` (sin pasar por un rol semántico ya
 * auditado) incumple por defecto sobre los fondos claros del sistema -- la
 * TERCERA vez que aparece este patrón exacto. El candado de familia que
 * cubre esto de forma sistémica (no solo estos seis casos) vive en
 * `src/theme/tokens/brandAccentContrast.test.ts`.
 *
 * El primer escalón de `primary`/`secondary`/`error` que pasa 4.5:1 contra
 * los fondos claros del sistema es 700 (medido exhaustivamente, ver el test
 * de familia) -- cualquier escalón por debajo queda descartado como color de
 * texto. El arreglo sube exactamente DOS escalones dentro de la MISMA rampa
 * (500→700, 600→800, 700→900) en vez de saltar todos al mismo "700 mínimo":
 * `05 Comparte` (secondary/700) ya cumplía por sí sola, pero si se dejara
 * intacta mientras `03 Imagina` sube de 500 a 700, las dos compartirían el
 * MISMO color exacto y `04 Crea` (subiendo a 800) se leería más oscura que
 * Comparte -- invirtiendo la progresión 500<600<700 del mockup original. El
 * desplazamiento UNIFORME de +2 escalones conserva esa progresión relativa
 * completa, sin que ningún escalón quede por debajo del piso AA. Verificado
 * contra los 6 fondos reales (`Journey.test.tsx`, fix wave E): 4.57 · 5.27 ·
 * 5.33 · 6.01 · 8.34 · 5.33, los seis con margen sobre 4.5:1.
 *
 * SOLO afecta al TEXTO de la etiqueta: `ScDisc` (el icono del disco, misma
 * rama clara) y `ScJourneyStepIconBox` (rama oscura, que ni siquiera monta
 * esta etiqueta) siguen leyendo `stepColor(...)` sin cambios -- ninguno de
 * los dos es texto, y el icono se pinta sobre `semantic.surface` (blanco
 * opaco), un fondo distinto con su propio margen de sobra.
 *
 * La rama `!theme.isLight` de esta función nunca se ejercita hoy --
 * `ScStepLabel` solo lo monta `JourneyLight` (`Journey()` nunca monta las
 * dos ramas a la vez) -- pero se resuelve igual que `stepColor` por simetría
 * con el resto de resolvers de acento del repo (`languageAccent`/
 * `navActiveAccent`/`ctaGradientMidStop`, todos `theme.isLight ? A : B`
 * aunque hoy solo una rama tenga consumidor real).
 */
const LABEL_SAFE_STEP: Record<JourneyStep["colorStep"], 700 | 800 | 900> = {
  500: 700,
  600: 800,
  700: 900,
};

export function stepLabelColor(
  theme: ThemeDefinition,
  step: Pick<JourneyStep, "colorRamp" | "colorStep">,
): string {
  if (!theme.isLight) return stepColor(theme, step);
  return theme.palette[step.colorRamp][LABEL_SAFE_STEP[step.colorStep]];
}

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, ghost-card):
 * regla borde-O-sombra, nunca los dos (impeccable) -- este disco CONSERVA su
 * sombra-glow (`$shadow`, coloreada por paso via `discShadow` en
 * `JOURNEY_STEPS`, journey.layers.ts) y RETIRA el borde 1px
 * (`JOURNEY_DISC_BORDER`, tambien retirado de journey.layers.ts por quedarse
 * sin consumidor). Por que este lado y no el otro: el disco es el marcador de
 * un paso dentro de una ESCENA -- la sombra ya es un halo de color que sugiere
 * luz propia (14% de alfa, tenida con el mismo hue que el icono/etiqueta del
 * paso, ver `discShadow` en journey.layers.ts), asi que un borde encima
 * competiria con ese glow por el mismo borde visual en vez de reforzarlo.
 * Comparese con `ScCard` en Contact.tsx (Task 12 tambien): esa es una
 * SUPERFICIE de tarjeta sobre la pagina, no un marcador de escena, y ahi la
 * regla elige el lado contrario (borde, sin sombra).
 */
const ScDisc = styled.div<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
  $shadow: string;
}>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${({ theme }) => theme.data.semantic.surface};
  box-shadow: ${({ $shadow }) => $shadow};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepColor(theme.data, { colorRamp: $colorRamp, colorStep: $colorStep })};
  flex: none;

  /* GlobalStyles fuerza svg { width: 100% }: sin esta regla el atributo
     width="22" del icono pierde la cascada y el dibujo se estira al ancho
     del disco (medido 54px en navegador, revision 2026-07-28 -- misma
     leccion que el Logo en task/lessons.md). */
  & > svg {
    width: 22px;
    height: 22px;
  }
`;

const ScStepLabel = styled.p<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
}>`
  margin: ${({ theme }) => theme.data.space[3]} 0 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 0.8125rem;
  font-weight: 700;
  /* stepLabelColor, NO stepColor (fix wave E, hallazgo E2): ver su docblock,
     más arriba, para las cifras medidas -- el color de TEXTO necesita un
     escalón AA-seguro distinto del que usa el icono del disco. */
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepLabelColor(theme.data, {
      colorRamp: $colorRamp,
      colorStep: $colorStep,
    })};
`;

const ScStepBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScQuote = styled.div`
  margin-top: ${({ theme }) => theme.data.space[7]};
  text-align: center;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 1rem;
  font-weight: 600;
`;

/*
 * Task 12 (dieta de ornamento B, auditoria premium 2026-08-08, 2026-08-09):
 * el degradado de texto (`background-clip: text` + `JOURNEY_QUOTE_GRADIENT_LIGHT`/
 * `_DARK`, retirados de `journey.layers.ts`) pasa a color solido. Mismo
 * motivo que `ScAccent` en Story.tsx/Contact.tsx: un degradado de texto queda
 * fuera del alcance de `contrast.ts`, asi que nadie lo habia medido nunca.
 *
 * El color elegido es el MISMO `semantic.brandText` que este bloque ya usaba
 * como fallback de `@supports not (background-clip: text)`. Se reutiliza TAL
 * CUAL en la diapositiva de cita de la presentacion oscura (`JourneyDeckDark`,
 * mas abajo): las dos ramas comparten el mismo componente en el mismo
 * instante, asi que hacen falta las dos medidas:
 *
 * - Rama CLARA: se pinta sobre `JOURNEY_CARD_BACKGROUND` (el degradado pastel
 *   translucido de `ScCard`, alfa ~0.92 sobre `semantic.bg`) -- brandText da
 *   entre 5.19:1 y 5.27:1 segun la parada, la peor de las dos por encima de
 *   AA (4.5:1).
 * - Rama OSCURA: se pinta sobre la escena `JourneyCosmicPortal`, cuyo void
 *   (`JOURNEY_PORTAL_VOID`, "#0b0620") es lo unico medible por codigo (jsdom
 *   no compone las capas WebP reales) -- brandText da 12.98:1. El propio
 *   `journeyCosmicPortal.layers.ts` documenta una esquina MEDIDA de la capa
 *   opaca real (`01-background`, "#12012a", "algo mas claro" que el void) --
 *   se mide tambien contra esa cifra (12.96:1, practicamente igual) porque es
 *   el dato mas cercano al pixel real que existe en el repo.
 *
 * Medicion completa en Journey.test.tsx, describe "Task 12".
 */
const ScQuoteText = styled.span`
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/*
 * NO SE SOLAPA CON EL CAMINO, pero NO por el motivo que este bloque afirmaba.
 * Corregido el 2026-08-14 con medición en navegador (QA §6, bloqueante 3).
 *
 * Lo que decía: que ocupa exactamente el hueco reservado por
 * `ScStepsAndQuote`, «mismo alto que el contenido real de esa columna vía
 * `inset-block: 0` + `height: 100%`», y que por eso no puede solaparse. Eso
 * dejó de ser cierto cuando la caja pasó a `height: 150%` con `top: -50px` y
 * `right: -50px`: **la caja SÍ invade la columna del texto**, 20 px sobre el
 * cuerpo del paso 06, y además la figura se pinta ENCIMA (`elementFromPoint`
 * devuelve la imagen en ese punto).
 *
 * Por qué aun así no se ve ningún solape, medido a 1200/1280/1440/1920:
 *
 *   1. `object-fit: contain` reduce la imagen entera para caber en la caja en
 *      vez de desbordarla (a diferencia del `cover` global de GlobalStyles),
 *      así que la caja crece pero el bitmap no.
 *   2. El propio bitmap trae un **margen transparente de 43 px** a esa escala
 *      en su borde izquierdo. Entre el final del texto y la primera columna de
 *      píxeles opacos quedan **23 px libres**, idénticos en los cuatro anchos.
 *
 * CONSECUENCIA FRÁGIL, y es el motivo de escribir esto en vez de borrar el
 * párrafo viejo: la holgura no la sostiene el layout, la sostiene el
 * RECORTE DEL ASSET. Si alguien re-exporta esta figura con el recorte más
 * ajustado —lo normal al optimizar peso— esos 43 px desaparecen y el texto
 * del paso 06 queda debajo de la ilustración sin que ningún test lo note.
 * Quien toque el asset re-mide; hay un ítem para ello en `PRE-LAUNCH-QA.md`.
 *
 * Desplazamiento de scroll (D1, ver el docblock de
 * JOURNEY_FIGURE_SCROLL_SHIFT en journey.layers.ts): directo en este mismo
 * elemento, sin envoltorio -- a diferencia de la figura de Story, ScFigure
 * no anima transform con @keyframes en ningún otro punto (esta rama de
 * Journey nunca tuvo flotación), así que no hay ninguna propiedad que
 * disputarle a una animación existente. El `transform` va DENTRO del mismo
 * bloque `@media xl` que ya declara `position: absolute`: por debajo de ese
 * ancho la figura ni siquiera se pinta (`display: none` arriba), así que un
 * `transform` fuera de ese bloque no tendría nada que desplazar.
 */
const ScFigure = styled.img`
  display: none;

  @media ${({ theme }) => theme.data.breakPoint.xl} {
    display: block;
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    width: ${JOURNEY_FIGURE_WIDTH};
    height: 150%;
    object-fit: contain;
    filter: ${JOURNEY_FIGURE_SHADOW};
    right: -50px;
    top: -50px;
    transform: translateY(
      calc(${JOURNEY_FIGURE_SCROLL_SHIFT} * var(--journey-progress, 0))
    );
  }

  @media (prefers-reduced-motion: reduce) {
    transform: none;
  }
`;

/** Icono SVG inline por paso (copiado verbatim del mockup L115-141: mismo
 *  `viewBox`, mismos `path`/`circle`, `currentColor` para heredar el color
 *  del disco/rampa). Decorativo — `aria-hidden`, la etiqueta de texto ya
 *  nombra el paso. Lo comparten las dos ramas: `ScDisc` (clara) y
 *  `ScJourneyStepIconBox` (oscura, `JourneyDeckDark` mas abajo). */
function StepIcon({ id }: { id: JourneyStepId }): ReactElement {
  const common = {
    "width": 22,
    "height": 22,
    "viewBox": "0 0 24 24",
    "fill": "none",
    "stroke": "currentColor",
    "strokeWidth": 2,
    "strokeLinecap": "round" as const,
    "strokeLinejoin": "round" as const,
    "aria-hidden": true,
    "focusable": false,
  };

  switch (id) {
    case "discover":
      return (
        <svg {...common}>
          <circle
            cx="12"
            cy="12"
            r="10"
          />
          <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
        </svg>
      );
    case "learn":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "imagine":
      return (
        <svg {...common}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
        </svg>
      );
    case "create":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle
            cx="18"
            cy="5"
            r="3"
          />
          <circle
            cx="6"
            cy="12"
            r="3"
          />
          <circle
            cx="18"
            cy="19"
            r="3"
          />
          <path d="M8.59 13.51l6.83 3.98" />
          <path d="M15.41 6.51l-6.82 3.98" />
        </svg>
      );
    case "evolve":
      return (
        <svg {...common}>
          <path d="M18.18 8c-2.4 0-4.11 1.64-6.18 4-2.07 2.36-3.78 4-6.18 4C3.61 16 2 14.21 2 12s1.61-4 3.82-4c2.4 0 4.11 1.64 6.18 4 2.07 2.36 3.78 4 6.18 4C20.39 16 22 14.21 22 12s-1.61-4-3.82-4z" />
        </svg>
      );
  }
}

export function Journey(): ReactElement {
  const { themeName } = useTheme();

  // Las dos ramas viven en componentes HIJO aparte (JourneyLight/
  // JourneyDeckDark, justo debajo) en vez de continuar aqui mismo: tanto
  // useSectionProgress (D1, spec
  // 2026-08-04-navegacion-fluida-parallax-microinteracciones-design.md,
  // rama clara) como useSlideDeck (D15, spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md, rama oscura) llaman a
  // window.matchMedia sin condicion en su efecto de montaje. Journey() es
  // UNA SOLA funcion para las dos ramas -- las reglas de los hooks de React
  // prohiben llamar un hook solo "cuando el tema es claro/oscuro" dentro de
  // ella, porque el tema puede cambiar en caliente sin desmontar Journey.
  // Llamar cualquiera de los dos hooks aqui rompería los tests de la OTRA
  // rama que no stubean matchMedia. Delegar cada rama a un componente que
  // solo se MONTA cuando le toca resuelve esto en las dos direcciones a la
  // vez: React nunca ejecuta los hooks de un componente que no se
  // renderiza.
  if (themeName !== "light") {
    return <JourneyDeckDark />;
  }

  return <JourneyLight />;
}

/*
 * Rama clara de Journey, extraida a su propio componente (ver el comentario
 * de mas arriba, en Journey()): aqui SI es seguro llamar
 * useSectionProgress sin condicion, porque este componente en si mismo solo
 * se monta cuando la rama clara esta activa.
 */
function JourneyLight(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  // Ref ESTABLE (useRef, no callback-ref): useSectionProgress escribe
  // --journey-enter/--journey-progress directamente sobre el propio
  // elemento en cada frame de rAF -- mismo motivo por el que
  // useSlideDeck/useSceneParallax exigen refs de identidad estable (ver
  // trackRef/stageRef en JourneyDeckDark, mas abajo).
  const sectionRef = useRef<HTMLElement>(null);
  // cssVarPrefix "journey" (D1): la rama OSCURA ya escribe
  // --journey-progress con este mismo nombre, a traves de useSlideDeck
  // (JourneyDeckDark, mas abajo) -- coincidencia deliberada, no un
  // descuido: las dos ramas son mutuamente excluyentes (nunca se montan a
  // la vez) y la variable significa lo mismo en las dos, "cuanto ha
  // avanzado el scroll de esta seccion por el viewport".
  useSectionProgress(sectionRef, { cssVarPrefix: "journey" });

  return (
    <ScJourney
      ref={sectionRef}
      id="journey"
      aria-labelledby="journey-title"
      $fullBleed={false}
    >
      <ScCard>
        {/* Task 11 (dieta de ornamento A, 2026-08-09): el kicker
            «Inspiración» se retira -- Journey abre con su encabezado real,
            no con una etiqueta de marca por encima. Solo Story conserva
            kicker (es una pregunta con voz, no una etiqueta). */}
        <ScHeader>
          <Typography
            variant="h2"
            id="journey-title"
          >
            {t("Home.journey.title")}
          </Typography>
          <ScBody variant="bodySm">{t("Home.journey.body")}</ScBody>
        </ScHeader>

        <ScStepsAndQuote>
          <ScStepsRow ref={revealRef}>
            <ScPath
              aria-hidden="true"
              viewBox={JOURNEY_PATH_VIEWBOX}
              preserveAspectRatio="none"
            >
              <path
                d={JOURNEY_PATH_D}
                fill="none"
                stroke={JOURNEY_PATH_STROKE}
                strokeWidth="2"
                strokeDasharray="1 8"
                strokeLinecap="round"
              />
            </ScPath>
            <ScStepsGrid>
              {JOURNEY_STEPS.map((step, index) => (
                <ScStepReveal
                  key={step.id}
                  $index={index}
                  data-revealed={revealed}
                >
                  <ScStepOffset $offsetY={step.offsetY}>
                    <ScDisc
                      $colorRamp={step.colorRamp}
                      $colorStep={step.colorStep}
                      $shadow={step.discShadow}
                    >
                      <StepIcon id={step.id} />
                    </ScDisc>
                    <ScStepLabel
                      $colorRamp={step.colorRamp}
                      $colorStep={step.colorStep}
                    >
                      {`${stepOrdinal(index)}${STEP_ORDINAL_SEPARATOR}${t(
                        `Home.journey.steps.${step.id}.label`,
                      )}`}
                    </ScStepLabel>
                    <ScStepBody variant="caption">
                      {t(`Home.journey.steps.${step.id}.body`)}
                    </ScStepBody>
                  </ScStepOffset>
                </ScStepReveal>
              ))}
            </ScStepsGrid>
          </ScStepsRow>

          <ScFigure
            src={JOURNEY_FIGURE_SRC}
            srcSet={`${JOURNEY_FIGURE_SRC_SMALL} 640w, ${JOURNEY_FIGURE_SRC} 1024w`}
            sizes={JOURNEY_FIGURE_SIZES}
            alt={t("Home.journey.figureAlt")}
            loading="lazy"
            decoding="async"
          />
        </ScStepsAndQuote>

        <ScQuote>
          <ScQuoteText>“{t("Home.journey.quote")}”</ScQuoteText>
        </ScQuote>
      </ScCard>
    </ScJourney>
  );
}

/*
 * Rama oscura de Journey, extraida a su propio componente (ver el
 * comentario de mas arriba, en Journey()): aqui SI es seguro llamar
 * useSlideDeck sin condicion, porque este componente en si mismo solo se
 * monta cuando la rama oscura esta activa.
 *
 * Reparto de las JOURNEY_SLIDES diapositivas (spec seccion 4): 0 = intro
 * (h2#journey-title + cuerpo), 1..JOURNEY_STEPS.length = un paso cada una
 * (icono -> etiqueta -> subtitulo, T5 de la spec
 * 2026-08-02-journey-deck-tipografia-design.md), la ultima = la cita. Hasta
 * Task 11 (dieta de ornamento A, 2026-08-09) la diapositiva 0 abria con un
 * kicker («Inspiración», `ScKicker`, reutilizado tal cual entre las dos
 * ramas) antes del h2 -- se retira en las DOS ramas de Journey: solo Story
 * conserva su kicker (voz propia, no etiqueta de marca repetida en cada
 * seccion). `ScQuoteText` SI se sigue reutilizando tal cual (la comparten las
 * dos ramas, arriba en este archivo); el resto de piezas de cartel viven en
 * journey.deck.tsx (`ScJourneyDeckTitle`/`ScJourneyIntroBody`/
 * `ScJourneyStepIconBox`/`ScJourneyStepLabel`/`ScJourneyStepSubtitle`/
 * `ScJourneyQuote`), con su PROPIA escala de tamanos (journey.layers.ts)
 * para no filtrar ningun ajuste a la rama clara.
 *
 * NUMERACION Y SENAL DE POSICION, historia completa porque este punto ya se
 * ha decidido tres veces:
 *
 * 1. La diapositiva compuso icono -> numero -> etiqueta -> cuerpo (D11 de la
 *    spec de las 8 diapositivas) hasta el 2026-08-02, cuando el usuario pidio
 *    explicitamente "quita las numeraciones de la seccion Journey" (acotado a
 *    esta rama tras preguntar el alcance, D16 de esa misma spec) y se retiro
 *    `ScJourneyStepNumber` con su constante de tamano
 *    (`JOURNEY_DECK_STEP_NUMBER_SIZE`).
 * 2. La Task 16 (2026-08-11) monto aqui un ordinal pequeno para igualar el
 *    contenido con la rama clara. La revision encontro la evidencia primaria
 *    de D16 y lo escalo: la asimetria era deliberada. RETIRADO el mismo dia.
 * 3. Lo que queda de aquel hallazgo, aceptado por el dueno: el rail
 *    (`ScJourneyRail`) es `aria-hidden`, asi que esta rama no daba ninguna
 *    senal de posicion a un lector de pantalla. La diapositiva abre ahora con
 *    un `VisuallyHidden` que dice "Paso N de 6" con PALABRAS
 *    (`Home.journey.stepPosition`) -- no un "01" suelto, que leido en voz
 *    alta no significa nada. Va delante de la etiqueta (tras el icono, que
 *    es `aria-hidden` y no suena) para que la posicion se anuncie antes que
 *    el nombre del paso, y no ocupa caja, asi que el ritmo
 *    visual (icono -> etiqueta a space[4] -> subtitulo) es exactamente el que
 *    D16 dejo.
 *
 * La rama CLARA conserva su "0N · Label" verbatim del mockup (`stepOrdinal`,
 * arriba). El total (`JOURNEY_STEPS.length`) se lee del array, nunca de un
 * literal: si el viaje gana o pierde un paso, el anuncio se corrige solo
 * (regla 39 de RULES.md).
 */
function JourneyDeckDark(): ReactElement {
  const { t } = useTranslation("home");
  // Namespace SEPARADO (Task 4, plan
  // 2026-08-10-implementacion-plan-premium-f1-f5), MISMO motivo que
  // StoryDeckDark (Story.tsx): `Common.Deck.scrollHint` vive en `common`, no
  // en `home` -- patron de interfaz compartido entre presentaciones, no
  // copia propia de esta seccion. Bajo `Common.Deck.*`, no como raiz plana
  // (regla 29 de RULES.md).
  const { t: tCommon } = useTranslation("common");

  // Refs ESTABLES (useRef, no callback-ref): useSlideDeck lee
  // getBoundingClientRect() de la pista en cada frame de rAF y escribe las
  // variables CSS de la coreografia directamente sobre el stage -- mismo
  // motivo por el que useSceneParallax exige refs de identidad estable en
  // vez de callbacks, y mismo patron que StoryDeckDark (Story.tsx).
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // cssVarPrefix: "journey" EXPLICITO (D4, spec
  // 2026-08-02-journey-deck-8-diapositivas-design.md): sin este parametro el
  // hook escribiria `--deck-enter`/`--deck-progress` (su defecto generico)
  // en vez de `--journey-enter`/`--journey-progress`, que es lo que
  // ScJourneySceneWrap (journey.deck.tsx) lee. `tailScreens:
  // JOURNEY_DECK_TAIL_SCREENS` (D4, spec
  // 2026-08-02-features-overlay-celestial-orbital-design.md): Journey SI
  // lleva cola ahora -- reversion consciente de D9 de la spec de las 8
  // diapositivas (ver el docblock de JOURNEY_DECK_TRACK_HEIGHT,
  // journey.layers.ts) -- porque Features, la seccion siguiente, se
  // superpone a Journey al final de su recorrido y necesita ese tramo de
  // pista quieto para subir sin comerse la cita de cierre. La opcion ya
  // existia y ya estaba probada (D4 de la spec de las 8 diapositivas,
  // escrita para Story): el hook no se toca, solo deja de quedarse en su
  // defecto `0`. El hook sigue calculando `direction` -- es parte de su
  // contrato -- pero aqui no se desestructura: D6 dice explicitamente que
  // Journey no consume "rewind", asi que no hay ningun `data-dir` en esta
  // seccion.
  // `scrollToSlide` (critica externa #10, hallazgo A): el rail deja de ser
  // decorativo y sus marcas pasan a ser botones que llevan al tramo de pista
  // que activa cada diapositiva. La geometria la invierte el hook, que es
  // quien ya la calcula en el sentido directo -- ver su docblock.
  const { index, scrollToSlide } = useSlideDeck(
    trackRef,
    stageRef,
    JOURNEY_SLIDES,
    {
      tailScreens: JOURNEY_DECK_TAIL_SCREENS,
      cssVarPrefix: "journey",
    },
  );

  // Estado de cada diapositiva: se decide AQUI, comparando su indice con el
  // `index` que escribe el hook -- el CSS de ScJourneySlide
  // (journey.deck.tsx) solo reacciona al atributo data-state resultante,
  // nunca calcula nada por si mismo (jsdom, ademas, no puede evaluar ningun
  // calculo que dependiera de scroll real).
  const slideState = (slideIndex: number): "past" | "current" | "next" => {
    if (slideIndex < index) return "past";
    if (slideIndex === index) return "current";
    return "next";
  };

  return (
    <ScJourney
      id="journey"
      aria-labelledby="journey-title"
      $fullBleed
    >
      {/* ScJourneyTrack da a la pagina el recorrido de scroll de las
          JOURNEY_SLIDES diapositivas; ScJourneyStage, su unico hijo en
          flujo, es quien se pega y permanece en pantalla mientras ese
          recorrido pasa por debajo (spec seccion 4). */}
      <ScJourneyTrack ref={trackRef}>
        <ScJourneyStage
          ref={stageRef}
          data-slide={index}
        >
          <ScJourneySceneWrap>
            <JourneyCosmicPortal />
          </ScJourneySceneWrap>
          <ScJourneyDeck>
            <ScJourneySlide
              data-slide-index={0}
              data-state={slideState(0)}
            >
              <ScJourneyDeckTitle id="journey-title">
                {t("Home.journey.title")}
              </ScJourneyDeckTitle>
              <ScJourneyIntroBody>{t("Home.journey.body")}</ScJourneyIntroBody>
            </ScJourneySlide>
            {JOURNEY_STEPS.map((step, stepIndex) => (
              <ScJourneySlide
                key={step.id}
                data-slide-index={stepIndex + 1}
                data-state={slideState(stepIndex + 1)}
              >
                <ScJourneyStepIconBox
                  $colorRamp={step.colorRamp}
                  $colorStep={step.colorStep}
                >
                  <StepIcon id={step.id} />
                </ScJourneyStepIconBox>
                <VisuallyHidden>
                  {t("Home.journey.stepPosition", {
                    current: stepIndex + 1,
                    total: JOURNEY_STEPS.length,
                  })}
                </VisuallyHidden>
                <ScJourneyStepLabel>
                  {t(`Home.journey.steps.${step.id}.label`)}
                </ScJourneyStepLabel>
                <ScJourneyStepSubtitle>
                  {t(`Home.journey.steps.${step.id}.body`)}
                </ScJourneyStepSubtitle>
              </ScJourneySlide>
            ))}
            <ScJourneySlide
              data-slide-index={JOURNEY_SLIDES - 1}
              data-state={slideState(JOURNEY_SLIDES - 1)}
            >
              <ScJourneyQuote>
                <ScQuoteText>“{t("Home.journey.quote")}”</ScQuoteText>
              </ScJourneyQuote>
            </ScJourneySlide>
          </ScJourneyDeck>
          {/* Rail de progreso (D13), OPERABLE desde la critica externa #10
              (hallazgo A): JOURNEY_SLIDES marcas que reflejan data-slide del
              stage por CSS puro (ScJourneyRailMark, journey.deck.tsx) y que
              ademas llevan a su diapositiva al pulsarlas.

              De aria-hidden a role="group" + aria-label: ocho botones
              operables no pueden estar fuera del arbol de accesibilidad, y
              sin agrupar se anunciarian como ocho controles sin relacion
              entre si.

              EL aria-label DICE LA POSICION, NO EL DESTINO ("Ir a la
              diapositiva 4 de 8", no "Ir a: Crea"), y es una decision, no una
              simplificacion: lo que este rail comunica es POR DONDE VAS
              --heuristica 7 de Nielsen, visibilidad del estado del sistema--
              y el nombre de cada diapositiva ya se anuncia al llegar a ella.
              Nombrar los ocho destinos aqui duplicaria el copy de la seccion
              en una segunda fuente (h2, seis etiquetas y la cita) que
              tendria que moverse a la vez que la primera.

              aria-current marca el activo. NO gobierna el estilo: eso lo
              sigue haciendo el selector descendiente sobre data-slide, que ya
              estaba probado -- ver el docblock de ScJourneyRailMark. */}
          <ScJourneyRail
            role="group"
            aria-label={t("Home.journey.railLabel")}
          >
            {Array.from({ length: JOURNEY_SLIDES }, (_, railIndex) => (
              <ScJourneyRailMark
                key={railIndex}
                type="button"
                $index={railIndex}
                aria-label={t("Home.journey.railGoTo", {
                  current: railIndex + 1,
                  total: JOURNEY_SLIDES,
                })}
                aria-current={railIndex === index ? "true" : undefined}
                onClick={() => scrollToSlide(railIndex)}
              />
            ))}
          </ScJourneyRail>
          {/* Pista de scroll (Task 4): visual, aria-hidden, se desvanece con
              el PRIMER avance del deck reutilizando data-slide (ver el
              docblock de ScJourneyScrollHint, journey.deck.tsx). */}
          <ScJourneyScrollHint aria-hidden="true">
            {tCommon("Common.Deck.scrollHint")}
          </ScJourneyScrollHint>
        </ScJourneyStage>
      </ScJourneyTrack>
    </ScJourney>
  );
}
