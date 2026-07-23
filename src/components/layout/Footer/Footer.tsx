"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Socials } from "@/components/layout/Socials/Socials";
import { Typography } from "@/components/ui/Typography/Typography";

const ScFooter = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2.5rem 1.5rem;
  background-color: ${({ theme }) => theme.data.background.primary[600]};
  border-top: 1px solid ${({ theme }) => theme.data.background.primary[300]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 3rem 2rem;
  }
`;

export function Footer() {
  const { t } = useTranslation("common");
  const year = new Date().getFullYear();

  return (
    <ScFooter>
      <Socials />
      <Typography variant="body">
        {t("Common.Footer.copyright", { year })}
      </Typography>
    </ScFooter>
  );
}
