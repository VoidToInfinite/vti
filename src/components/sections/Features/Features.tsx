"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import type { ThemeDefinition } from "@/theme/theme.types";
import {
  FEATURE_KEYS,
  FEATURE_CARD_VISUALS,
  FEATURE_FIGURE_BASENAME,
  FEATURES_FIGURE_SIZES,
  FEATURES_CARD_RADIUS,
  FEATURES_CTA_TRANSITION_MS,
  FEATURES_CTA_HOVER_TRANSLATE_X,
  FEATURES_CTA_MIN_HEIGHT,
  FEATURES_CHECK_ICON_PATH,
  FEATURES_GAMING_TITLE_GRADIENT,
  FEATURES_GAMING_ACCENT,
  FEATURES_GAMING_ACCENT_HOVER,
  type FeatureKey,
} from "./features.layers";

/*
 * Features (mockup `Landing v2.dc.html` L157-210, spec §7.3).
 *
 * Reescritura completa: la versión anterior mostraba tres áreas genéricas del
 * equipo (`Home.sections.*`, showcase de componentes) con un CTA final al
 * playground. El contrato i18n congelado (spec §4.1) sustituye ese contenido
 * por las tres identidades de marca (Learning/Imagination/Gaming) con cuerpo,
 * cuatro bullets y CTA propios cada una; el CTA al playground desaparece (el
 * mockup no lo tiene, cada tarjeta ya enlaza a `#contact`).
 */

const BULLET_KEYS = ["one", "two", "three", "four"] as const;

/** Índice del escalón de reveal por tarjeta (mismo mecanismo que
 *  `ScStepReveal` en Journey.tsx: 120ms por tarjeta, como ya hacía este
 *  componente). */
const STAGGER_STEP_MS = 120;

/**
 * Color de acento por tarjeta (check de los bullets y CTA de texto — el
 * mockup usa el MISMO color para los dos roles en las tres tarjetas, ver
 * `features.layers.ts`). Learning/Imagination resuelven contra la rampa real
 * del tema (`var(--primary-600)`/`var(--secondary-600)` del mockup son los
 * mismos nombres de paso que `theme.data.palette`); Gaming usa el literal
 * propio que no tiene equivalente de tema (`FEATURES_GAMING_ACCENT`).
 */
function accentColor(theme: ThemeDefinition, key: FeatureKey): string {
  if (key === "learning") return theme.palette.primary[600];
  if (key === "imagination") return theme.palette.secondary[600];
  return FEATURES_GAMING_ACCENT;
}

/** Estado hover del acento (mockup: un paso más oscuro de la misma rampa). */
function accentColorHover(theme: ThemeDefinition, key: FeatureKey): string {
  if (key === "learning") return theme.palette.primary[700];
  if (key === "imagination") return theme.palette.secondary[700];
  return FEATURES_GAMING_ACCENT_HOVER;
}

const ScFeatures = styled.section`
  padding: ${({ theme }) => theme.data.space[8]}
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[9]};
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[6]};
`;

const ScHeader = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
`;

/* Kicker: mismo mapeo que `ScKicker` en Story.tsx/Hero.tsx para el mismo rol
   visual ("etiqueta de marca", mockup `var(--primary-600)`, L159) —
   `semantic.brandText`, no un paso de palette suelto. */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Los tres términos del h2 son spans de color — no hay separador en el
   `.html` exportado del mockup (`<span>Learning</span><span>Imagination…`,
   L160, concatenados sin espacio): se restaura un espacio de texto plano
   entre ellos porque la ausencia total de separación es un artefacto de la
   herramienta de exportación, no una intención legible del diseño ni de
   accesibilidad (un lector de pantalla anunciaría "LearningImaginationGaming"
   como una sola palabra). */
const ScSpanLearning = styled.span`
  /* mockup: var(--primary-800) (L160) === theme.data.semantic.brandText
     (primary[800], ver semantic.ts) -- coincidencia exacta, no aproximada. */
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

const ScSpanImagination = styled.span`
  /* mockup: var(--primary-500) (L160) === theme.data.semantic.brand
     (primary[500]) -- coincidencia exacta. */
  color: ${({ theme }) => theme.data.semantic.brand};
`;

const ScSpanGaming = styled.span`
  background-image: ${FEATURES_GAMING_TITLE_GRADIENT};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  /* Red de seguridad: sin soporte de background-clip: text el degradado no
     puede quedar como único portador del color (mismo recurso que ScAccent
     en Story.tsx / ScQuoteText en Journey.tsx). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${FEATURES_GAMING_ACCENT};
    -webkit-text-fill-color: ${FEATURES_GAMING_ACCENT};
  }
`;

const ScGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.grid.gutter};
  width: 100%;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

/* Reveal escalonado por tarjeta -- mismo mecanismo que el componente
   anterior conservaba (guard reduced-motion que fuerza el estado final Y
   anula el propio `transition-delay`, no solo la duración: si no, el
   escalonado seguiría "saltando" tarde bajo reduce en vez de aparecer ya
   resuelto). Learning ocupa las dos columnas solo ≥ md (mockup L163:
   `grid-column: span 2`); por debajo de `md` hay una sola columna y la regla
   no tiene efecto visible. */
const ScItem = styled.div<{ $index: number; $fullWidth: boolean }>`
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized};
  transition-delay: ${({ $index }) => $index * STAGGER_STEP_MS}ms;

  ${({ $fullWidth, theme }) =>
    $fullWidth && `@media ${theme.data.breakPoint.md} { grid-column: 1 / -1; }`}

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

const ScCard = styled.article<{ $key: FeatureKey }>`
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 240px;
  border-radius: ${FEATURES_CARD_RADIUS};
  border: 1px solid ${({ $key }) => FEATURE_CARD_VISUALS[$key].border};
  background: ${({ $key }) => FEATURE_CARD_VISUALS[$key].background};
  box-shadow: ${({ $key }) => FEATURE_CARD_VISUALS[$key].shadow};
  transition:
    transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    box-shadow ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    border-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex-direction: row;
  }

  &:hover {
    transform: translateY(
      ${({ $key }) => FEATURE_CARD_VISUALS[$key].hoverTranslateY}
    );
    box-shadow: ${({ $key }) => FEATURE_CARD_VISUALS[$key].shadowHover};
    border-color: ${({ $key }) => FEATURE_CARD_VISUALS[$key].borderHover};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

const ScPattern = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

/** Patrón SVG decorativo de fondo, copiado verbatim del mockup por tarjeta
 *  (`FEATURE_CARD_VISUALS[key].patternShapes`, L165/180/195). Puramente
 *  ornamental -- `aria-hidden`. */
function FeaturePattern({ cardKey }: { cardKey: FeatureKey }): ReactElement {
  const visual = FEATURE_CARD_VISUALS[cardKey];
  return (
    <ScPattern aria-hidden="true">
      <defs>
        <pattern
          id={visual.patternId}
          width="84"
          height="84"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${visual.patternRotate})`}
        >
          <g
            fill="none"
            stroke={visual.patternStroke}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {visual.patternShapes.map((shape, index) =>
              shape.type === "path" ? (
                <path
                  key={index}
                  d={shape.d}
                />
              ) : (
                <circle
                  key={index}
                  cx={shape.cx}
                  cy={shape.cy}
                  r={shape.r}
                />
              ),
            )}
          </g>
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill={`url(#${visual.patternId})`}
      />
    </ScPattern>
  );
}

/* < md: el mockup no describe una figura apilada (solo el layout de fila
   `figura izquierda + contenido` de ≥ md, spec §7.3); "figuras proporcionadas"
   se resuelve con una altura fija razonable en vez de un porcentaje de la
   fila (que en apilado no existe) — 9.5rem (152px) mantiene las tres figuras
   legibles sin desbordar una tarjeta apilada de ancho de viewport. */
const ScFigure = styled.img<{ $key: FeatureKey }>`
  position: relative;
  z-index: 1;
  display: block;
  width: auto;
  height: 9.5rem;
  align-self: center;
  margin-inline: auto;
  object-fit: contain;
  filter: ${({ $key }) => FEATURE_CARD_VISUALS[$key].figureDropShadow};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    align-self: flex-end;
    height: ${({ $key }) => FEATURE_CARD_VISUALS[$key].figureHeight};
    margin-inline: 0;
    margin-left: ${({ theme, $key }) =>
      $key === "learning" ? theme.data.space[4] : theme.data.space[3]};
  }
`;

const ScContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding: ${({ theme }) => theme.data.space[4]}
    ${({ theme }) => theme.data.space[5]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex: 1;
    justify-content: center;
  }
`;

const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  max-width: ${({ theme }) => theme.data.grid.prose};
`;

const ScBullets = styled.div<{ $twoColumns: boolean }>`
  display: grid;
  grid-template-columns: ${({ $twoColumns }) =>
    $twoColumns ? "repeat(2, minmax(0, 1fr))" : "1fr"};
  gap: ${({ theme, $twoColumns }) =>
    $twoColumns
      ? `${theme.data.space[2]} ${theme.data.space[5]}`
      : theme.data.space[2]};
`;

const ScBulletItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScCheckIcon = styled.svg<{ $key: FeatureKey }>`
  flex: none;
  /* GlobalStyles fuerza svg { width: 100% } en todo el sitio: sin esta
     declaracion el atributo width="15" pierde la cascada y el check se
     estira al ancho del bullet (medido 435px en navegador, revision
     2026-07-28 -- misma leccion que el Logo en task/lessons.md). */
  width: 15px;
  height: 15px;
  stroke: ${({ theme, $key }) => accentColor(theme.data, $key)};
`;

const ScCta = styled.a<{ $key: FeatureKey }>`
  display: inline-flex;
  align-items: center;
  min-height: ${FEATURES_CTA_MIN_HEIGHT};
  margin-block-start: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h5.weight};
  color: ${({ theme, $key }) => accentColor(theme.data, $key)};
  transition:
    transform ${FEATURES_CTA_TRANSITION_MS}
      ${({ theme }) => theme.data.motion.easing.standard},
    color ${FEATURES_CTA_TRANSITION_MS}
      ${({ theme }) => theme.data.motion.easing.standard};

  &:hover {
    color: ${({ theme, $key }) => accentColorHover(theme.data, $key)};
    transform: translateX(${FEATURES_CTA_HOVER_TRANSLATE_X});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export function Features(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

  return (
    <ScFeatures
      id="features"
      aria-labelledby="features-title"
    >
      <ScHeader>
        {/* forwardedAs, NO as: sobre un styled(Typography), `as` lo consume
            styled-components y sustituye a Typography entero por un <p>
            crudo (variant se cuela al DOM y la variante pierde sus estilos;
            mismo pitfall documentado en Hero.tsx:369). */}
        <ScKicker
          variant="overline"
          forwardedAs="p"
        >
          {t("Home.features.kicker")}
        </ScKicker>
        <Typography
          variant="h2"
          id="features-title"
        >
          <ScSpanLearning>{t("Home.features.learning.title")}</ScSpanLearning>{" "}
          <ScSpanImagination>
            {t("Home.features.imagination.title")}
          </ScSpanImagination>{" "}
          <ScSpanGaming>{t("Home.features.gaming.title")}</ScSpanGaming>
        </Typography>
      </ScHeader>

      <ScGrid ref={revealRef}>
        {FEATURE_KEYS.map((key, index) => {
          const basename = FEATURE_FIGURE_BASENAME[key];
          const isLearning = key === "learning";

          return (
            <ScItem
              key={key}
              $index={index}
              $fullWidth={isLearning}
              data-revealed={revealed}
            >
              <ScCard
                $key={key}
                aria-labelledby={`feature-${key}-title`}
              >
                <FeaturePattern cardKey={key} />
                <ScFigure
                  $key={key}
                  src={`/figures/${basename}-1024.webp`}
                  srcSet={`/figures/${basename}-640.webp 640w, /figures/${basename}-1024.webp 1024w`}
                  sizes={FEATURES_FIGURE_SIZES}
                  loading="lazy"
                  decoding="async"
                  alt={t(`Home.features.${key}.figureAlt`)}
                />
                <ScContent>
                  <Typography
                    variant="h3"
                    id={`feature-${key}-title`}
                  >
                    {t(`Home.features.${key}.title`)}
                  </Typography>
                  <ScBody variant="bodySm">
                    {t(`Home.features.${key}.body`)}
                  </ScBody>
                  <ScBullets $twoColumns={isLearning}>
                    {BULLET_KEYS.map((bulletKey) => (
                      <ScBulletItem key={bulletKey}>
                        <ScCheckIcon
                          $key={key}
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          focusable="false"
                        >
                          <path d={FEATURES_CHECK_ICON_PATH} />
                        </ScCheckIcon>
                        <span>
                          {t(`Home.features.${key}.bullets.${bulletKey}`)}
                        </span>
                      </ScBulletItem>
                    ))}
                  </ScBullets>
                  <ScCta
                    href="#contact"
                    $key={key}
                  >
                    {t(`Home.features.${key}.cta`)} →
                  </ScCta>
                </ScContent>
              </ScCard>
            </ScItem>
          );
        })}
      </ScGrid>
    </ScFeatures>
  );
}
