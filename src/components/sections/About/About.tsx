"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";

const ScAbout = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 48rem;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 6rem 2rem;
  }
`;

const ScAboutLogo = styled.img`
  height: 3rem;
  width: auto;
  /* logo.svg is drawn in solid white for dark backgrounds; invert it in the
     light theme so the mark stays visible against a light page background. */
  filter: ${({ theme }) => (theme.data.isLightTheme ? "invert(1)" : "none")};
`;

export function About() {
  const { t } = useTranslation("home");

  return (
    <ScAbout id="about">
      <ScAboutLogo
        src="/brand/logo.svg"
        alt=""
        aria-hidden="true"
      />
      <Typography variant="h2">{t("Home.about.title")}</Typography>
      <Typography variant="body">{t("Home.about.description")}</Typography>
      <Typography variant="body">
        {t("Home.about.additionalDescription")}
      </Typography>
    </ScAbout>
  );
}
