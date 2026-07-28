"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { Socials } from "@/components/layout/Socials/Socials";
import { Logo } from "@/components/ui/Logo/Logo";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";
import { useTheme } from "@/theme/ThemeProvider";

/*
 * Footer (spec 2026-07-28-landing-v2-secciones-design.md §7.5, D6, mockup
 * `Landing v2.dc.html` L240-291): a diferencia de las 4 secciones de
 * `HomeSections`, este componente vive en LOS DOS TEMAS -- el encargo del
 * usuario (§1) es "tema oscuro: solo hero y footer", así que el footer NO
 * puede desaparecer en oscuro. Lo que SÍ cambia con el tema son las
 * columnas "Explore" y "Discover": son anclas a las 4 secciones de tema
 * claro (`#story`/`#journey`/`#features`/`#contact`) y a `#features`, que en
 * oscuro no existen -- serían anclas muertas (mismo motivo que D5 en el
 * Navbar). El bloque de marca, la columna "Resources" (enlaces externos,
 * ninguno depende de las secciones) y la barra inferior (copyright +
 * legales) no dependen de qué secciones estén montadas: viven en los dos
 * temas sin condición.
 *
 * Sin reveal (spec §7.5): el footer está debajo del pliegue final de la
 * página y no usa `useReveal`/`IntersectionObserver`, a diferencia de las 4
 * secciones de tema claro.
 */

const ScFooter = styled.footer`
  background-color: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border-top: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

/* Grid de columnas ≥ md (spec: "grid de columnas ≥ md / apilado debajo").
   `auto-fit`/`minmax`, no las fracciones literales del mockup (1.4fr 1fr 1fr
   1fr 1.3fr): ese layout asume las 4 columnas SIEMPRE presentes, y aquí el
   número real de columnas varía con el tema (2 en oscuro, 4 en claro) --
   `auto-fit` reparte el espacio disponible entre las que de verdad se
   montan, en vez de dejar huecos vacíos en las pistas de Explore/Discover
   cuando no existen. */
const ScInner = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[5]};
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.data.space[6]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    padding-inline: ${({ theme }) => theme.data.space[6]};
  }
`;

const ScBrandCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.data.space[3]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    /* La marca ocupa más ancho que una columna de enlaces (mockup: 1.4fr
       frente a 1fr): con auto-fit eso se aproxima ocupando dos pistas
       cuando hay sitio, sin forzarlo cuando el footer se reduce a 2
       columnas (oscuro). */
    grid-column: span 2;
    max-width: 22rem;
  }
`;

const ScBrandRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: 1rem;
`;

const ScTagline = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

const ScColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[3]};
`;

const ScColumnTitle = styled(Typography)`
  font-weight: 700;
`;

const ScColumnLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
`;

/* Enlace secundario del footer: `textMuted` en reposo, `brandText` al hover
   -- mismo rol/transición que `ScNavLink` del Navbar (spec §7.5/§7.6 piden
   el mismo lenguaje visual para los enlaces de sección de los dos
   componentes). Sin subrayado: GlobalStyles ya fija `text-decoration: none`
   en todos los `a`. */
const ScFooterLink = styled.a`
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

const ScBottomBar = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  padding: 0 ${({ theme }) => theme.data.space[5]}
    ${({ theme }) => theme.data.space[5]};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
  text-align: center;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding-inline: ${({ theme }) => theme.data.space[6]};
    text-align: start;
  }
`;

const ScBottomLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[4]};
`;

/* Anclas de sección (Explore, D2): mismos 4 destinos que el Navbar. Fuera de
   ambos componentes porque cada uno necesita su propio par clave/traducción
   (`Common.Navigation.*`) pero NO comparten estilo -- se repite la lista
   literal en vez de extraer un módulo compartido para dos usos, mismo
   criterio de "cambio mínimo" que el resto de la entrega. */
const SECTION_LINKS = [
  { key: "story", href: "#story" },
  { key: "journey", href: "#journey" },
  { key: "features", href: "#features" },
  { key: "contact", href: "#contact" },
] as const;

/* Discover (D6): Learning/Imagination/Gaming son los TÍTULOS de
   `Home.features.*` (namespace "home"), no claves de navegación nuevas --
   los tres apuntan a la misma sección `#features` (spec §7.5). */
const DISCOVER_LINKS = ["learning", "imagination", "gaming"] as const;

export function Footer(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName } = useTheme();
  const year = new Date().getFullYear();
  const isLight = themeName === "light";

  return (
    <ScFooter>
      <ScInner>
        <ScBrandCol>
          <ScBrandRow>
            <Logo size="1.5rem" />
            <BrandName />
          </ScBrandRow>
          <ScTagline variant="bodySm">{t("Common.Footer.tagline")}</ScTagline>
          <Socials />
        </ScBrandCol>

        {isLight && (
          <ScColumn>
            <ScColumnTitle variant="bodySm">
              {t("Common.Footer.explore")}
            </ScColumnTitle>
            <ScColumnLinks>
              {SECTION_LINKS.map(({ key, href }) => (
                <ScFooterLink
                  key={key}
                  href={href}
                >
                  {t(`Common.Navigation.${key}`)}
                </ScFooterLink>
              ))}
            </ScColumnLinks>
          </ScColumn>
        )}

        {isLight && (
          <ScColumn>
            <ScColumnTitle variant="bodySm">
              {t("Common.Footer.discover")}
            </ScColumnTitle>
            <ScColumnLinks>
              {DISCOVER_LINKS.map((key) => (
                <ScFooterLink
                  key={key}
                  href="#features"
                >
                  {t(`home:Home.features.${key}.title`)}
                </ScFooterLink>
              ))}
            </ScColumnLinks>
          </ScColumn>
        )}

        <ScColumn>
          <ScColumnTitle variant="bodySm">
            {t("Common.Footer.resources")}
          </ScColumnTitle>
          <ScColumnLinks>
            <ScFooterLink
              href={links.docs}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Common.Footer.documentation")}
            </ScFooterLink>
            <ScFooterLink
              href={links.guides}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Common.Footer.guides")}
            </ScFooterLink>
            <ScFooterLink
              href={links.accessibility}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Common.Footer.accessibility")}
            </ScFooterLink>
          </ScColumnLinks>
        </ScColumn>
      </ScInner>

      <ScBottomBar>
        <Typography
          variant="caption"
          as="span"
        >
          {t("Common.Footer.copyright", { year })}
        </Typography>
        <ScBottomLinks>
          <ScFooterLink
            href={links.privacy}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Common.Footer.privacy")}
          </ScFooterLink>
          <ScFooterLink
            href={links.terms}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Common.Footer.terms")}
          </ScFooterLink>
          <ScFooterLink
            href={links.accessibility}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Common.Footer.accessibility")}
          </ScFooterLink>
        </ScBottomLinks>
      </ScBottomBar>
    </ScFooter>
  );
}
