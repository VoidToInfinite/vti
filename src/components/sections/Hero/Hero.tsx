"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Eye } from "@/components/eye/Eye";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";

const ScHero = styled.section`
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[6]}
    ${({ theme }) => theme.data.space[5]};
  overflow: hidden;
`;

const ScEye = styled(Eye)`
  flex: none;
`;

/* Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Cada hijo
   entra 120ms despues del anterior. Solo transform/opacity. */
const ScCopy = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[4]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  text-align: center;

  > * {
    animation: rise ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.decelerate} backwards;
  }
  > *:nth-child(2) {
    animation-delay: 120ms;
  }
  > *:nth-child(3) {
    animation-delay: 240ms;
  }
  > *:nth-child(4) {
    animation-delay: 360ms;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }
`;

const ScActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  justify-content: center;
`;

/* El titular de portada usa la unica variante de la escala pensada para el
   hero (theme.data.type.scale.display): BrandName renderiza a font-size: 1em,
   asi que sin este contenedor el <h1> hereda el 1em del body (GlobalStyles
   resetea h1..h6 a font-size: 1em) y queda mas pequeno que el lead de abajo. */
const ScHeroBrand = styled.div`
  font-size: ${({ theme }) => theme.data.type.scale.display.size};
`;

export function Hero(): ReactElement {
  const { t } = useTranslation("home");

  return (
    <ScHero>
      <ScEye />
      <ScCopy>
        <ScHeroBrand>
          <BrandName as="h1" />
        </ScHeroBrand>
        <Typography variant="lead">{t("Home.description")}</Typography>
        <Typography variant="body">
          {t("Home.additionalDescription")}
        </Typography>
        <ScActions>
          <Button
            as="a"
            href={links.playground}
            size="lg"
          >
            {t("Home.cta.explore")}
          </Button>
          <Button
            as="a"
            href="#story"
            variant="ghost"
            size="lg"
          >
            {t("Home.cta.story")}
          </Button>
        </ScActions>
      </ScCopy>
    </ScHero>
  );
}
