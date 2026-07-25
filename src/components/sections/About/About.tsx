"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";

const ScAbout = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[5]};
  max-width: 48rem;
  margin: 0 auto;
  padding: ${({ theme }) => theme.data.space[8]}
    ${({ theme }) => theme.data.space[5]};
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: ${({ theme }) => theme.data.space[9]}
      ${({ theme }) => theme.data.space[6]};
  }
`;

const ScAboutLogo = styled.img`
  height: ${({ theme }) => theme.data.space[7]};
  width: auto;
  /* logo.svg is drawn in solid white for dark backgrounds; invert it in the
     light theme so the mark stays visible against a light page background. */
  filter: ${({ theme }) => (theme.data.isLight ? "invert(1)" : "none")};
`;

export function About() {
  const { t } = useTranslation("home");

  return (
    <ScAbout id="about">
      <ScAboutLogo
        src="/brand/logo.svg"
        alt="VoidToInfinite"
      />
      <Typography variant="h2">{t("Home.about.title")}</Typography>
      <Typography variant="body">{t("Home.about.description")}</Typography>
      <Typography variant="body">
        {t("Home.about.additionalDescription")}
      </Typography>
    </ScAbout>
  );
}
