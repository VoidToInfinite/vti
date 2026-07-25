"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Card } from "@/components/ui/Card/Card";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { links } from "@/config/links";

/**
 * Áreas reales del equipo, ya presentes en i18n (`Home.sections.*`, spec
 * §11). No se inventan componentes ni métricas de `vti-sdk` (viven en otro
 * repo) — el showcase es la copia real del equipo.
 */
const AREAS = ["learning", "imagination", "gaming"] as const;

const ScFeatures = styled.section`
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[7]};
`;

const ScGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.data.grid.gutter};
  grid-template-columns: 1fr;
  width: 100%;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/* Component assembly (spec §6/§11): las cards se ensamblan desde la
   profundidad con un escalonado de 120ms — "el sistema se enfoca desde el
   vacío", hecho literal. Solo transform/opacity; el transition-delay del
   escalonado también se anula bajo reduced-motion (si no, el colapso de
   duración a 0 seguiría dejando el delay en pie y el ensamblaje "saltaría"
   tarde en vez de aparecer ya resuelto). */
const ScItem = styled.div<{ $index: number }>`
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized};
  transition-delay: ${({ $index }) => $index * 120}ms;

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

const ScCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
  height: 100%;
`;

export function Features(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

  return (
    <ScFeatures
      id="features"
      aria-labelledby="features-title"
    >
      <Typography
        variant="h2"
        id="features-title"
      >
        {t("Home.sections.title")}
      </Typography>
      <ScGrid ref={revealRef}>
        {AREAS.map((area, index) => (
          <ScItem
            key={area}
            $index={index}
            data-revealed={revealed}
          >
            <Card as="article">
              <ScCardContent>
                <Typography variant="h3">
                  {t(`Home.sections.${area}.title`)}
                </Typography>
                <Typography variant="bodySm">
                  {t(`Home.sections.${area}.subtitle`)}
                </Typography>
                <Typography variant="body">
                  {t(`Home.sections.${area}.description`)}
                </Typography>
              </ScCardContent>
            </Card>
          </ScItem>
        ))}
      </ScGrid>
      <Button
        as="a"
        href={links.playground}
        size="lg"
      >
        {t("Home.cta.explore")}
      </Button>
    </ScFeatures>
  );
}
