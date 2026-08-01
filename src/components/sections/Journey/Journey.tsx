"use client";

import { useEffect, useRef, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeDefinition } from "@/theme/theme.types";
import { JourneyCosmicPortal } from "@/components/journeyCosmicPortal/JourneyCosmicPortal";
import {
  JOURNEY_PORTAL_HEIGHT,
  JOURNEY_PORTAL_MAX_WIDTH,
} from "@/components/journeyCosmicPortal/journeyCosmicPortal.layers";
import {
  JOURNEY_STEPS,
  JOURNEY_CARD_BACKGROUND,
  JOURNEY_DISC_BORDER,
  JOURNEY_PATH_VIEWBOX,
  JOURNEY_PATH_D,
  JOURNEY_PATH_STROKE,
  JOURNEY_QUOTE_GRADIENT_DARK,
  JOURNEY_QUOTE_GRADIENT_LIGHT,
  JOURNEY_FIGURE_SHADOW,
  JOURNEY_FIGURE_WIDTH,
  JOURNEY_FIGURE_SIZES,
  JOURNEY_FIGURE_SRC,
  JOURNEY_FIGURE_SRC_SMALL,
  type JourneyStep,
  type JourneyStepId,
} from "./journey.layers";

/*
 * Rama OSCURA (2026-07-30, mismo criterio que la de Story,
 * `docs/superpowers/specs/2026-07-29-story-dark-cosmic-heart-design.md`): no
 * hay mockup oscuro de esta sección. En vez de la tarjeta pastel + camino
 * punteado + rejilla de 6 columnas + figura en columna propia, el fondo es
 * la escena parallax `JourneyCosmicPortal` (6 capas) y el contenido (mismo
 * i18n `Home.journey.*`) se superpone encima, en una columna estrecha —
 * igual que Story en oscuro. Se elimina el camino SVG punteado (sin
 * equivalente: la "senda" ya vive DENTRO de la escena de fondo) y la figura
 * en `<img>` propia (ídem, ahora decorativa dentro de la escena). Los 6
 * pasos se re-maquetan como filas verticales (mismo patrón que los pilares
 * de `Story.tsx`) en vez de la rejilla de 6 columnas con discos: esa rejilla
 * está pensada para una tarjeta ancha con fondo propio, no para superponerse
 * a una imagen.
 */

/** Paso entre pasos del reveal escalonado (mismo mecanismo que `ScItem` en
 *  `Features.tsx`, spec §7.2: "~90ms por paso"). */
const STEP_STAGGER_MS = 90;

/*
 * Rama clara: contenedor normal (padding + tope de ancho, centrado -- sin
 * cambios). Rama oscura ($fullBleed): misma caja acotada y centrada que
 * `ScStory` en oscuro (`Story.tsx`) -- `JOURNEY_PORTAL_MAX_WIDTH`/
 * `JOURNEY_PORTAL_HEIGHT`, no `grid.containerMax`, por el mismo motivo
 * documentado allí (medida propia de la composición oscura, no del grid).
 */
const ScJourney = styled.section<{ $fullBleed: boolean }>`
  ${({ $fullBleed, theme }) =>
    $fullBleed
      ? css`
          position: relative;
          overflow: hidden;
          width: 100%;
          max-width: ${JOURNEY_PORTAL_MAX_WIDTH};
          height: 90vh;
          height: ${JOURNEY_PORTAL_HEIGHT};
          margin-inline: auto;
          display: flex;
          align-items: center;
          background-color: ${theme.data.palette.secondary[1100]};
          transform: translateY(
            calc(100% * (1 - var(--journey-scroll-offset, 0)))
          );
          opacity: var(--journey-scroll-opacity, 1);
          transition:
            transform ${theme.data.motion.duration.slow}
              ${theme.data.motion.easing.emphasized},
            opacity ${theme.data.motion.duration.slow}
              ${theme.data.motion.easing.emphasized};

          @media (prefers-reduced-motion: reduce) {
            transform: none;
            transition: none;
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

const ScPath = styled.svg`
  display: none;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 96px;

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    display: block;
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

/* Escalonado de reveal (opacity/transform), separado del offset de layout
   (`ScStepOffset`, más abajo) para que los dos `transform` de este paso
   vivan en elementos DISTINTOS y no se pisen entre sí — el mismo motivo por
   el que `ScItem`/tarjeta están separados en `Features.tsx`. */
const ScStepReveal = styled.div<{ $index: number }>`
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized};
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
   invisible en un motor que no soporte el recorte. */
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
  }
`;

/* Reveal de la rama oscura: mismo mecanismo que `ScDarkContent` en
   `Story.tsx` -- lleva su propio padding/tope de ancho, centrado.
   Max-width de 1280px (spec 2026-08-01, D3): acotacion explicita
   para experiencia visual coherente con escena de fondo. */
const ScDarkContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1280px;
  width: 100%;
  padding: ${({ theme }) => theme.data.space[8]}
    ${({ theme }) => theme.data.space[6]};
  margin-inline: auto;
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }
`;

const ScDarkBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Los 6 pasos como filas verticales (mismo patrón que `ScPillarRow` en
   Story.tsx), no como la rejilla de 6 columnas con discos de la rama clara:
   esa rejilla está pensada para una tarjeta ancha con fondo propio, no para
   superponerse a una imagen en una columna estrecha. */
const ScDarkSteps = styled.div`
  display: flex;
  flex-direction: column;
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

const ScDarkStepRow = styled.div`
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: ${({ theme }) => theme.data.space[4]};
  align-items: baseline;
  padding-block: ${({ theme }) => theme.data.space[4]};
  border-block-start: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

const ScDarkStepIcon = styled.span<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
}>`
  display: flex;
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepColor(theme.data, { colorRamp: $colorRamp, colorStep: $colorStep })};

  /* Mismo candado que ScDisc: GlobalStyles fuerza svg { width: 100% }. */
  & > svg {
    width: 20px;
    height: 20px;
  }
`;

const ScDarkStepCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
`;

const ScDarkStepLabel = styled.p<{
  $colorRamp: JourneyStep["colorRamp"];
  $colorStep: JourneyStep["colorStep"];
}>`
  margin: 0;
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${({ theme, $colorRamp, $colorStep }) =>
    stepColor(theme.data, { colorRamp: $colorRamp, colorStep: $colorStep })};
`;

const ScDarkStepBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScDarkQuote = styled.div`
  margin-top: ${({ theme }) => theme.data.space[7]};
  font-family: ${({ theme }) => theme.data.type.fontBody};
  font-size: 1rem;
  font-weight: 600;
`;

/** Icono SVG inline por paso (copiado verbatim del mockup L115-141: mismo
 *  `viewBox`, mismos `path`/`circle`, `currentColor` para heredar el color
 *  del disco). Decorativo — `aria-hidden`, la etiqueta de texto ya nombra el
 *  paso. */
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
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();
  const journeyRef = useRef<HTMLElement | null>(null);

  /* Calcula scroll offset para transición: Journey se anima desde abajo
     conforme entra en viewport. Usa CSS variables para control sin re-render. */
  useEffect(() => {
    const handleScroll = (): void => {
      const el = journeyRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      /* scrollOffset: 0 cuando Journey está abajo (rect.top > windowHeight),
         1 cuando Journey llena el viewport (rect.top ≤ 0). */
      const scrollOffset = Math.max(
        0,
        Math.min(1, (windowHeight - rect.top) / windowHeight),
      );

      el.style.setProperty("--journey-scroll-offset", scrollOffset.toString());
      el.style.setProperty("--journey-scroll-opacity", "1");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); /* trigger inicial */
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (themeName !== "light") {
    return (
      <ScJourney
        ref={journeyRef}
        id="journey"
        aria-labelledby="journey-title"
        $fullBleed
      >
        <JourneyCosmicPortal />
        <ScDarkContent
          ref={revealRef}
          data-revealed={revealed}
        >
          <ScKicker variant="overline">{t("Home.journey.kicker")}</ScKicker>
          <Typography
            variant="h2"
            id="journey-title"
          >
            {t("Home.journey.title")}
          </Typography>
          <ScDarkBody variant="bodySm">{t("Home.journey.body")}</ScDarkBody>

          <ScDarkSteps>
            {JOURNEY_STEPS.map((step, index) => (
              <ScDarkStepRow key={step.id}>
                <ScDarkStepIcon
                  $colorRamp={step.colorRamp}
                  $colorStep={step.colorStep}
                >
                  <StepIcon id={step.id} />
                </ScDarkStepIcon>
                <ScDarkStepCopy>
                  <ScDarkStepLabel
                    $colorRamp={step.colorRamp}
                    $colorStep={step.colorStep}
                  >
                    {String(index + 1).padStart(2, "0")} ·{" "}
                    {t(`Home.journey.steps.${step.id}.label`)}
                  </ScDarkStepLabel>
                  <ScDarkStepBody variant="caption">
                    {t(`Home.journey.steps.${step.id}.body`)}
                  </ScDarkStepBody>
                </ScDarkStepCopy>
              </ScDarkStepRow>
            ))}
          </ScDarkSteps>

          <ScDarkQuote>
            <ScQuoteText>“{t("Home.journey.quote")}”</ScQuoteText>
          </ScDarkQuote>
        </ScDarkContent>
      </ScJourney>
    );
  }

  return (
    <ScJourney
      id="journey"
      aria-labelledby="journey-title"
      $fullBleed={false}
      ref={journeyRef}
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
