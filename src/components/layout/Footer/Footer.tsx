"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Socials } from "@/components/layout/Socials/Socials";
import { Typography } from "@/components/ui/Typography/Typography";

const ScFooter = styled.footer`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[4]};
  padding: 2.5rem ${({ theme }) => theme.data.space[5]};
  background-color: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border-top: 1px solid ${({ theme }) => theme.data.semantic.border};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: ${({ theme }) => theme.data.space[7]}
      ${({ theme }) => theme.data.space[6]};
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
