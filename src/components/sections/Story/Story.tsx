"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes, type DefaultTheme } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { useTheme } from "@/theme/ThemeProvider";
import { StoryCosmicHeart } from "@/components/storyCosmicHeart/StoryCosmicHeart";
import {
  STORY_ACCENT_GRADIENT_DARK,
  STORY_ACCENT_GRADIENT_LIGHT,
  STORY_CARD_BG,
  STORY_CARD_BORDER,
  STORY_CARD_FLOAT_MS,
  STORY_CARD_SHADOW,
  STORY_FIGURE_ASPECT,
  STORY_FIGURE_FLOAT_MS,
  STORY_FIGURE_HEIGHT,
  STORY_FIGURE_SIZES,
  STORY_FIGURE_WIDTH,
  STORY_FLOAT_AMPLITUDE,
  STORY_HALO_GRADIENT,
  STORY_HALO_INSET,
} from "./story.layers";

/*
 * Story ("Why VoidToInfinite?"). Rama CLARA (mockup `Landing v2.dc.html`
 * L70-101): grid figura+contenido, sin cambios de comportamiento respecto a
 * la reescritura de 2026-07-28 (D3/D4 de ese spec).
 *
 * Rama OSCURA (spec 2026-07-29): no hay mockup oscuro de esta seccion. En
 * vez de la figura recortada + halo + tarjeta flotante, el fondo es la
 * escena parallax `StoryCosmicHeart` (8 capas, D1-D12 del spec) y el
 * contenido (mismo i18n `Home.story.*`) se superpone encima. La nota
 * (`Home.story.note`) se conserva como linea de cierre bajo los pilares,
 * SIN la tarjeta flotante ni el icono sparkle (D8): esta composicion no
 * tiene sitio para una tarjeta sin tapar el nucleo del corazon.
 *
 * `themeName` decide la rama (no `theme.data.isLight`): mismo criterio que
 * `HomeSections.tsx`, que ya usa `useTheme()` de `@/theme/ThemeProvider`
 * para esta misma decision.
 */

/* Flotacion compartida por la figura y la tarjeta de nota EN CLARO (mismo
   keyframe que el mockup reutiliza con dos duraciones distintas, ver
   story.layers.ts). La rama oscura no la usa: su unica animacion es el
   pulso del nucleo, declarado en storyCosmicHeart.parts.tsx. */
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

const ScStory = styled.section`
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
`;

/* Reveal de sección en CLARO (mismo patrón que `ScItem` en Features.tsx). */
const ScGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[7]};
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
  border-radius: ${({ theme }) => theme.data.radius.full};
  background-image: ${STORY_HALO_GRADIENT};
  pointer-events: none;
`;

const ScFigureImg = styled.img`
  position: relative;
  display: block;
  width: min(${STORY_FIGURE_WIDTH}, 100%);
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

const ScNoteCard = styled.div`
  position: absolute;
  inset-block-end: 90%;
  inset-inline-start: -25%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  max-width: 220px;
  background-color: ${STORY_CARD_BG};
  border: 1px solid ${STORY_CARD_BORDER};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[4]};
  box-shadow: 0 12px 30px ${STORY_CARD_SHADOW};

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    inset-inline-end: -6%;
  }

  @media (prefers-reduced-motion: no-preference) {
    animation: ${float} ${STORY_CARD_FLOAT_MS}ms ease-in-out infinite;
  }
`;

const ScSparkle = styled.svg`
  flex: none;
  /* GlobalStyles fuerza svg { width: 100% }: sin esta declaracion el
     atributo width="20" pierde la cascada y el sparkle se estira al ancho
     de la tarjeta (medido 186px en navegador, revision 2026-07-28 -- misma
     leccion que el Logo en task/lessons.md). */
  width: 20px;
  height: 20px;
  color: ${({ theme }) => theme.data.palette.primary[600]};
`;

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

const ScTitle = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
`;

/* Degradado seleccionado por tema (spec 2026-07-29 D10): mismas paradas de
   hue, luminosidad mucho mayor en oscuro para que el background-clip:text
   siga siendo legible sobre el negro-violeta de StoryCosmicHeart. */
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

const ScBody = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

const ScPillars = styled.div`
  display: flex;
  flex-direction: column;
  margin-block-start: ${({ theme }) => theme.data.space[6]};
`;

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

/* Envoltorio de la rama OSCURA: caja con altura propia (la escena de fondo
   es `position:absolute; inset:0`, necesita un ancestro con tamaño real) y
   `overflow:hidden` para que el overscan del parallax no desborde el layout
   de la pagina. */
const ScDarkSection = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  min-height: 520px;

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    min-height: 620px;
  }
`;

/* Reveal de la rama oscura: mismo mecanismo que ScGrid, pero SOLO sobre el
   contenido -- la escena de fondo (StoryCosmicHeart) no usa useReveal, esta
   siempre presente y en movimiento propio. */
const ScDarkContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: ${({ theme }) => theme.data.grid.prose};
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.space[6]};
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

const ScNote = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[6]};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

export function Story(): ReactElement {
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

  const pillars = (
    <ScPillars>
      {PILLARS.map((pillar, index) => (
        <ScPillarRow key={pillar.key}>
          <ScPillarNumber $index={index}>{pillar.number} —</ScPillarNumber>
          <ScPillarCopy>
            <Typography
              variant="h5"
              as="p"
            >
              {t(`Home.story.pillars.${pillar.key}.title`)}
            </Typography>
            <Typography variant="bodySm">
              {t(`Home.story.pillars.${pillar.key}.body`)}
            </Typography>
          </ScPillarCopy>
        </ScPillarRow>
      ))}
    </ScPillars>
  );

  const heading = (
    <>
      <ScKicker variant="overline">{t("Home.story.kicker")}</ScKicker>
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

  if (themeName === "light") {
    return (
      <ScStory
        id="story"
        aria-labelledby="story-title"
      >
        <ScGrid
          ref={revealRef}
          data-revealed={revealed}
        >
          <ScFigureWrap>
            <ScHalo aria-hidden="true" />
            <ScFigureImg
              src="/figures/journey-presenting-1024.webp"
              srcSet="/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w"
              sizes={STORY_FIGURE_SIZES}
              alt={t("Home.story.figureAlt")}
              loading="lazy"
              decoding="async"
            />
            <ScNoteCard>
              <ScSparkle
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
                <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
              </ScSparkle>
              <Typography variant="bodySm">
                {t("Home.story.note")}
              </Typography>
            </ScNoteCard>
          </ScFigureWrap>

          <ScContent>
            {heading}
            {pillars}
          </ScContent>
        </ScGrid>
      </ScStory>
    );
  }

  return (
    <ScStory
      id="story"
      aria-labelledby="story-title"
    >
      <ScDarkSection>
        <StoryCosmicHeart />
        <ScDarkContent
          ref={revealRef}
          data-revealed={revealed}
        >
          {heading}
          {pillars}
          <ScNote variant="bodySm">{t("Home.story.note")}</ScNote>
        </ScDarkContent>
      </ScDarkSection>
    </ScStory>
  );
}
