"use client";

import { useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useSectionProgress } from "@/hooks/useSectionProgress";
import { useSlideDeck } from "@/hooks/useSlideDeck";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { JourneyCosmicPortal } from "@/components/journeyCosmicPortal/JourneyCosmicPortal";
import {
  ScJourneyDeck,
  ScJourneyDeckTitle,
  ScJourneyIntroBody,
  ScJourneyQuote,
  ScJourneyRail,
  ScJourneyRailMark,
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
  JOURNEY_DISC_BORDER,
  JOURNEY_FIGURE_SCROLL_SHIFT,
  JOURNEY_PATH_VIEWBOX,
  JOURNEY_PATH_D,
  JOURNEY_PATH_SCROLL_SHIFT,
  JOURNEY_PATH_STROKE,
  JOURNEY_QUOTE_GRADIENT_DARK,
  JOURNEY_QUOTE_GRADIENT_LIGHT,
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
 * Rama CLARA: sin cambios de comportamiento (tarjeta pastel + camino
 * punteado + rejilla de 6 columnas + figura en columna propia).
 */

/** Paso entre pasos del reveal escalonado (mismo mecanismo que `ScItem` en
 *  `Features.tsx`, spec §7.2: "~90ms por paso"). Solo lo consume la rama
 *  clara -- la oscura, al ser una presentacion de diapositivas, no tiene
 *  reveal escalonado propio (cada diapositiva entra entera con el mismo
 *  mecanismo de `ScJourneySlide`). */
const STEP_STAGGER_MS = 90;

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
          max-width: ${theme.data.grid.containerMax};
          margin-inline: auto;
          padding: ${theme.data.space[8]} ${theme.data.space[6]};
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

/* Mismo patrón que `ScKicker` en `Hero.tsx`: mayúsculas por CSS (no en el
   JSON, así un lector de pantalla no lo deletrea como sigla) y color de la
   rampa que pide el mockup (`--secondary-600`), no el `brandText` semántico
   del kicker del hero. `letter-spacing` se sobrescribe al valor literal del
   mockup (0.22em vs. los 0.18em de `overline`), misma excepción documentada
   que `ScSubtitle` en `Hero.tsx`. */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.palette.secondary[600]};
  letter-spacing: 0.22em;
`;

const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
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
      ${JOURNEY_FIGURE_WIDTH} + ${({ theme }) => theme.data.space[5]} - 150px
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
 */
const ScStepReveal = styled.div<{ $index: number }>`
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slower}
      ${({ theme }) => theme.data.motion.easing.decelerate};
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

const ScDisc = styled.div<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
  $shadow: string;
}>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${({ theme }) => theme.data.semantic.surface};
  border: 1px solid ${JOURNEY_DISC_BORDER};
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
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepColor(theme.data, { colorRamp: $colorRamp, colorStep: $colorStep })};
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

/* Degradado de texto estático (la spec §7.2 no pide animarlo, a diferencia
   del tramo `ToInfinite` de `BrandName.tsx`), con la misma red de seguridad
   de `@supports not (background-clip: text)` para no dejar el texto
   invisible en un motor que no soporte el recorte. Se reutiliza TAL CUAL en
   la diapositiva de cita de la presentacion oscura (`JourneyDeckDark`, mas
   abajo): las dos ramas comparten el mismo degradado en el mismo instante. */
const ScQuoteText = styled.span`
  background-image: ${({ theme }) =>
    theme.data.isLight
      ? JOURNEY_QUOTE_GRADIENT_LIGHT
      : JOURNEY_QUOTE_GRADIENT_DARK};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  @supports not (background-clip: text) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }
`;

/*
 * Ocupa EXACTAMENTE el hueco reservado por `ScStepsAndQuote` (mismo ancho en el
 * `padding-inline-end` de arriba, mismo alto que el contenido real de esa
 * columna vía `inset-block: 0` + `height: 100%`): no puede solaparse con el
 * camino/rejilla porque ese hueco es espacio que ellos ya no ocupan, y no
 * puede recortarse porque `object-fit: contain` reduce imagen entera para
 * caber en la caja en vez de desbordarla (a diferencia del `cover` global
 * de GlobalStyles).
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
    height: 100%;
    object-fit: contain;
    filter: ${JOURNEY_FIGURE_SHADOW};
    right: -60px;
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
        <ScHeader>
          <ScKicker variant="overline">{t("Home.journey.kicker")}</ScKicker>
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
                      {String(index + 1).padStart(2, "0")} ·{" "}
                      {t(`Home.journey.steps.${step.id}.label`)}
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
 * (kicker + h2#journey-title + cuerpo), 1..JOURNEY_STEPS.length = un paso
 * cada una (icono -> etiqueta -> subtitulo, T5 de la spec
 * 2026-08-02-journey-deck-tipografia-design.md), la ultima = la cita.
 * `ScKicker`/`ScQuoteText` se REUTILIZAN tal cual (las comparten las dos
 * ramas, arriba en este archivo); el resto de piezas de cartel viven en
 * journey.deck.tsx (`ScJourneyDeckTitle`/`ScJourneyIntroBody`/
 * `ScJourneyStepIconBox`/`ScJourneyStepLabel`/`ScJourneyStepSubtitle`/
 * `ScJourneyQuote`), con su PROPIA escala de tamanos (journey.layers.ts)
 * para no filtrar ningun ajuste a la rama clara.
 *
 * SIN numero de paso (retirado 2026-08-02, encargo explicito del usuario:
 * "quita las numeraciones de la seccion Journey", acotado a esta rama tras
 * preguntar el alcance). La diapositiva de paso compuso icono -> numero ->
 * etiqueta -> cuerpo (D11 de la spec de esta entrega) hasta hoy; la rama
 * CLARA conserva su "0N · Label" tal cual, verbatim del mockup aprobado --
 * este cambio es exclusivo de la presentacion oscura. `ScJourneyStepNumber`
 * (el styled que pintaba "01".."06") se retiro por completo de
 * journey.deck.tsx junto con la constante de tamano que consumia
 * (`JOURNEY_DECK_STEP_NUMBER_SIZE`, journey.layers.ts): sin numero que
 * mostrar, ninguna de las dos tenia ya consumidor.
 */
function JourneyDeckDark(): ReactElement {
  const { t } = useTranslation("home");

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
  const { index } = useSlideDeck(trackRef, stageRef, JOURNEY_SLIDES, {
    tailScreens: JOURNEY_DECK_TAIL_SCREENS,
    cssVarPrefix: "journey",
  });

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
              <ScKicker variant="overline">{t("Home.journey.kicker")}</ScKicker>
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
          {/* Rail decorativo (D13): JOURNEY_SLIDES marcas, aria-hidden, que
              reflejan data-slide del stage por CSS puro
              (ScJourneyRailMark, journey.deck.tsx) -- no llevan estado
              propio de React, solo su indice fijo. */}
          <ScJourneyRail aria-hidden="true">
            {Array.from({ length: JOURNEY_SLIDES }, (_, railIndex) => (
              <ScJourneyRailMark
                key={railIndex}
                $index={railIndex}
              />
            ))}
          </ScJourneyRail>
        </ScJourneyStage>
      </ScJourneyTrack>
    </ScJourney>
  );
}
