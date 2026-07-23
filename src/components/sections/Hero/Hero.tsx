"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BackOrbs } from "@/components/layout/BackOrbs/BackOrbs";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { Socials } from "@/components/layout/Socials/Socials";
import { Typography } from "@/components/ui/Typography/Typography";

const ScHero = styled.section`
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 2rem 4rem;
  }
`;

const ScHeroContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 42rem;
`;

const ScHeroBrand = styled.div`
  font-size: 2rem;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    font-size: 2.75rem;
  }
`;

const ScScrollCue = styled.p`
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.typography.secondaryColor[500]};
`;

export function Hero() {
  const { t } = useTranslation("home");

  return (
    <ScHero>
      <BackOrbs />
      <ScHeroContent>
        <ScHeroBrand>
          <BrandName />
        </ScHeroBrand>
        <Typography variant="lead">{t("Home.description")}</Typography>
        <Typography variant="body">
          {t("Home.additionalDescription")}
        </Typography>
        <Socials />
        <ScScrollCue>{t("Home.swipeUp")}</ScScrollCue>
      </ScHeroContent>
    </ScHero>
  );
}
