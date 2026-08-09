"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

/*
 * Cuerpo de cliente de la 404 (auditoria SEO 2026-08-08, mismo patron que
 * las paginas legales -- ver `PrivacyDocument.tsx`): `app/not-found.tsx`
 * exporta `metadata`, y una ruta que exporta `metadata` NO puede ser
 * Client Component (el plugin de TypeScript de Next lo marca como error
 * explicito, ver el docblock de `app/privacidad/page.tsx`). El texto
 * traducido SI necesita cliente (`useTranslation`), asi que vive aqui, en un
 * componente aparte que la cascara de servidor solo monta.
 */

/*
 * Enlace de salida de la trampa (auditoria premium 2026-08-08, P0: la 404
 * no tenia NINGUN enlace, ni Navbar/Footer ni nada dentro del propio
 * `<main>` -- un visitante que aterrizaba aqui no tenia forma de volver al
 * sitio sin usar el boton "atras" del navegador). `next/link` a `/` para
 * navegacion de cliente real dentro del export estatico (`output: "export"`,
 * ver CLAUDE.md), no un `<a>` pelado.
 *
 * Estilo LOCAL a este componente, no importado de
 * `src/components/legal/legalPage.parts.tsx` (que ya tiene un `ScBackLink`
 * visualmente identico): esa pieza es propiedad de la categoria `legal`
 * (su propio docblock la describe como "de las 4 paginas legales") y
 * `NotFoundContent` vive en la categoria `sections` (regla 2 de RULES.md,
 * categorias separadas). Se replica el MISMO lenguaje visual (mismos
 * tokens: `semantic.textMuted` en reposo, `semantic.brandText` en
 * hover/foco, `motion.duration.fast`) para que la experiencia sea
 * consistente en todo el sitio, sin acoplar dos categorias de componentes
 * que hoy se mantienen deliberadamente separadas.
 */
const ScBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.data.space[5]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  transition: color ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brandText};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function NotFoundContent(): ReactElement {
  const { t } = useTranslation("common");
  return (
    <main>
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.message")}</p>
      <ScBackLink href="/">{t("notFound.backToHome")}</ScBackLink>
    </main>
  );
}
