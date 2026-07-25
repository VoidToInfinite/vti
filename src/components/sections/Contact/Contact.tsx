"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Button } from "@/components/ui/Button/Button";
import { Socials } from "@/components/layout/Socials/Socials";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";

/**
 * Escena 4 y última (spec §2): tras el ojo, el descenso y el showcase, aquí
 * el espectáculo se retira del todo para que la petición sea imposible de no
 * ver. Sin escena 3D, sin reveal escalonado, sin efectos — la calma es el
 * diseño, no un recorte de scope.
 */
const ScContact = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.prose};
  margin-inline: auto;
  text-align: center;
`;

export function Contact(): ReactElement {
  const { t } = useTranslation("home");

  return (
    <ScContact
      id="contact"
      aria-labelledby="contact-title"
    >
      <Typography
        variant="h2"
        id="contact-title"
      >
        {t("Home.contact.title")}
      </Typography>
      <Typography variant="lead">{t("Home.contact.body")}</Typography>
      <Button
        as="a"
        href={links.email}
        size="lg"
      >
        {t("Home.contact.email")}
      </Button>
      <Socials />
    </ScContact>
  );
}
