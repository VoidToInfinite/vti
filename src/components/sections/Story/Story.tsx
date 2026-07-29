"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes, type DefaultTheme } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import {
  STORY_ACCENT_GRADIENT,
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
 * Story ("Why VoidToInfinite?", mockup `Landing v2.dc.html` L70-101).
 *
 * CONTEXTO DE LA REESCRITURA (spec 2026-07-28, D3/D4): la versión anterior de
 * este componente era una superficie SIEMPRE oscura -- ThemeProvider anidado
 * con `basicDarkTheme`, `ScSeam` (velo negro de continuidad con el hero) y
 * `SceneLoader`/`useScrollProgress` (Three.js) montados aquí. Los tres
 * desaparecen en esta entrega:
 *
 *  - Three.js se retira por completo del repo (D4); `useScrollProgress` no
 *    tenía más consumidor que este componente.
 *  - El gate por tema (`HomeSections`, D3) hace que Story SOLO se monte
 *    cuando la página está en tema CLARO -- ya no hace falta forzar un tema
 *    propio ni protegerse del tema ambiental.
 *  - La costura con el hero YA NO HACE FALTA (medido, no supuesto): el pie
 *    del hero claro (`ScAuraFoot`, `aura.parts.tsx:473-485`) es una rampa que
 *    ASCIENDE hasta terminar exactamente en `theme.data.semantic.bg` -- el
 *    mismo fondo contra el que resuelve esta sección, que no declara
 *    `background` propio y expone directamente la superficie del sistema
 *    (heredada del `body`). No hay filo duro que disimular.
 *
 * Story es ahora una sección de tema ambiental corriente: usa
 * `theme.data.semantic.*` tal cual, sin ThemeProvider propio.
 */

/* Flotación compartida por la figura y la tarjeta de nota (mismo keyframe que
   el mockup reutiliza con dos duraciones distintas, ver story.layers.ts). */
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

/** Color de cada número de pilar: los tres primeros son pasos reales de
 *  `palette.primary`/`palette.secondary` (mockup L82/87/92: `--primary-500`,
 *  `--secondary-500`, `--secondary-600`) -- referencia directa al tema, no
 *  un literal nuevo (mismo criterio que `ctaGlow` en Hero.tsx). El cuarto
 *  pilar ("practice", 2026-07-28) no existe en el mockup original: se
 *  continúa la MISMA rampa un paso más (`secondary[700]`) en vez de
 *  inventar un color ajeno al sistema. */
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

/* Reveal de sección (mismo patrón que `ScItem` en Features.tsx): una idea a
   la vez, solo transform/opacity, guard reduced-motion que fuerza el estado
   final. Sin escalonado por elemento -- a diferencia de Journey (spec §7.2),
   Story no lo pide. */
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

const ScAccent = styled.span`
  background-image: ${STORY_ACCENT_GRADIENT};
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

export function Story(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

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
            srcSet={`/figures/journey-presenting-640.webp 640w, /figures/journey-presenting-1024.webp 1024w`}
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
            <Typography variant="bodySm">{t("Home.story.note")}</Typography>
          </ScNoteCard>
        </ScFigureWrap>

        <ScContent>
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
          <ScPillars>
            {PILLARS.map((pillar, index) => (
              <ScPillarRow key={pillar.key}>
                <ScPillarNumber $index={index}>
                  {pillar.number} —
                </ScPillarNumber>
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
        </ScContent>
      </ScGrid>
    </ScStory>
  );
}
