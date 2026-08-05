"use client";

import type { CSSProperties, ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { useConsent } from "@/consent/ConsentProvider";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { SectionBeam } from "@/components/sectionBeam/SectionBeam";
import { Logo } from "@/components/ui/Logo/Logo";
import { Typography } from "@/components/ui/Typography/Typography";
import { links } from "@/config/links";
import { useTheme } from "@/theme/ThemeProvider";
import {
  type FooterStar,
  FOOTER_DARK_BG,
  FOOTER_STARS,
  FOOTER_STAR_TWINKLE_MAX_SCALE,
  FOOTER_STAR_TWINKLE_MIN_OPACITY,
  FOOTER_STAR_TWINKLE_MIN_SCALE,
} from "./footer.layers";

/*
 * Footer (spec 2026-07-28-landing-v2-secciones-design.md §7.5, D6, mockup
 * `Landing v2.dc.html` L240-291): a diferencia de las 4 secciones de
 * `HomeSections`, este componente vive en LOS DOS TEMAS -- el encargo del
 * usuario (§1) es "tema oscuro: solo hero y footer", así que el footer NO
 * puede desaparecer en oscuro. El bloque de marca, la columna "Resources"
 * (enlaces externos, ninguno depende de las secciones) y la barra inferior
 * (copyright + legales) no dependen de qué secciones estén montadas: viven en
 * los dos temas sin condición.
 *
 * D16 (spec 2026-08-03-contacto-footer-oscuro-design.md): las columnas
 * "Explore" y "Discover" vuelven a montarse SIEMPRE, revirtiendo a propósito
 * la decisión anterior de este mismo fichero -- que las ocultaba en oscuro
 * porque eran "anclas a las 4 secciones de tema claro ... que en oscuro no
 * existen". Esa premisa quedó obsoleta antes que el propio gate: `HomeSections`
 * (`HomeSections.tsx:17-26`) dejó de condicionar el montaje de
 * Story/Journey/Features/Contact por tema -- las 4 se montan SIEMPRE -- y
 * cada una declara su `id` en las dos ramas (comprobado con grep, no de
 * memoria: `Story.tsx:363,482`, `Journey.tsx:479,634`, `Features.tsx:702,788`,
 * `Contact.tsx:425,455`). Las anclas del footer nunca llegaron a estar
 * "muertas" en la página real.
 *
 * D17: el fondo oscuro pasa a `FOOTER_DARK_BG` (casi negro del mockup,
 * `footer.layers.ts`) y el `border-top` de la rama clara se sustituye, SOLO
 * en oscuro, por el mismo haz de luz (`SectionBeam`, D7) que ya usa Contacto
 * como costura -- la frontera entre dos secciones oscuras se marca con el
 * haz, no con un borde sólido.
 *
 * D9/D10: el footer estrena `useReveal` SOLO para su costura -- lo trae el
 * propio `SectionBeam` -- y un campo de 24 estrellas titilantes precalculadas
 * (`footer.layers.ts`, D10: tabla de constantes, no `Math.random()`, para no
 * romper la hidratación de este `output: 'export'`). El CONTENIDO del footer
 * (enlaces, copyright) sigue SIN reveal: el footer está debajo del pliegue
 * final de la página y no usa `useReveal`/`IntersectionObserver` para su
 * contenido, a diferencia de las 4 secciones de tema claro. Lo que sí
 * necesita saber cuándo se le mira es el haz, por el mismo motivo que D8 de
 * la spec: dibujarlo al montar lo dejaría ya dibujado mucho antes de que
 * nadie llegase a verlo.
 *
 * La rama clara NO cambia de aspecto (D1): sigue con `semantic.surfaceSunken`
 * y su `border-top`, sin haz ni estrellas.
 */

const ScFooter = styled.footer<{ $dark: boolean }>`
  ${({ $dark, theme }) =>
    $dark
      ? css`
          position: relative;
          background-color: ${FOOTER_DARK_BG};
        `
      : css`
          background-color: ${theme.data.semantic.surfaceSunken};
          border-top: 1px solid ${theme.data.semantic.border};
        `}
`;

/* Campo de estrellas titilantes (D9/D10): contenedor decorativo, sin captura
   de puntero, del mismo tamaño que el footer -- solo se monta en oscuro. */
const ScStars = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

/* `starTwinkle`, VERBATIM del mockup (`Footer animado v2.dc.html` L29):
   solo `opacity`/`transform`. Infinita -- se declara solo bajo
   `no-preference` y el bloque `reduce` fuerza `animation: none` explícito
   (D8: con el colapso global `animation-iteration-count: 1 !important`, una
   animación infinita corre una vez y deja un fotograma arbitrario, no el
   último). */
const starTwinkle = keyframes`
  0%,
  100% {
    opacity: ${FOOTER_STAR_TWINKLE_MIN_OPACITY};
    transform: scale(${FOOTER_STAR_TWINKLE_MIN_SCALE});
  }
  50% {
    opacity: 1;
    transform: scale(${FOOTER_STAR_TWINKLE_MAX_SCALE});
  }
`;

/*
 * Una estrella. Su variación (posición, tamaño, tinte, halo, ritmo) NO entra
 * por props interpoladas en el template sino por PROPIEDADES PERSONALIZADAS
 * que cada instancia escribe en su atributo `style` (`starVars`, más abajo).
 *
 * La diferencia no es de gusto, está MEDIDA. Con las cinco interpolaciones
 * como props transitorias, styled-components genera una clase distinta por
 * estrella -- y con ella sus dos bloques `@media` -- así que 24 estrellas son
 * 24 clases y ~72 reglas inyectadas en la hoja en tiempo de ejecución. Coste
 * real del render completo de la página en oscuro: **5160 ms con las 24
 * estrellas frente a 4315 ms con cero** (media de varias corridas del mismo
 * fichero de integración, `app/home-page.flujo.test.tsx`), es decir ~850 ms
 * y ~35 ms por estrella, solo en inyección de CSS. Eso bastaba para que ese
 * test síncrono desbordara el presupuesto de 5000 ms de Vitest con los
 * workers por defecto. Con variables, el template es ESTÁTICO: una sola
 * clase para las 24, y la variación viaja en el atributo `style`, que el
 * navegador resuelve sin tocar la hoja de estilos.
 *
 * En reposo (`reduce`, o antes de que `no-preference` aplique la animación)
 * queda en su opacidad mínima -- el mismo valor que el 0%/100% del propio
 * keyframe -- para no destellar de golpe a opacidad 1.
 */
const ScStar = styled.div`
  position: absolute;
  top: var(--star-top);
  left: var(--star-left);
  width: var(--star-size);
  height: var(--star-size);
  border-radius: 50%;
  background: var(--star-tint);
  box-shadow: var(--star-glow);
  opacity: ${FOOTER_STAR_TWINKLE_MIN_OPACITY};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${starTwinkle} var(--star-duration) ease-in-out var(--star-delay)
      infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* Las cinco variables de una estrella, en el formato que espera el CSS de
   `ScStar`. Vive fuera del componente porque no depende de nada del render.
   `box-shadow` necesita `none` explícito cuando la estrella no lleva halo:
   una variable sin valor dejaría la declaración inválida. */
function starVars(star: FooterStar): CSSProperties {
  return {
    "--star-top": star.top,
    "--star-left": star.left,
    "--star-size": star.size,
    "--star-tint": star.tint,
    "--star-glow": star.glow ?? "none",
    "--star-duration": `${star.durationMs}ms`,
    "--star-delay": `${star.delayMs}ms`,
  } as CSSProperties;
}

/* Grid de columnas ≥ md (spec: "grid de columnas ≥ md / apilado debajo").
   `auto-fit`/`minmax`, no las fracciones literales del mockup (1.4fr 1fr 1fr
   1fr 1.3fr): las 4 columnas de enlaces se montan siempre (D16), pero
   `auto-fit` sigue siendo el criterio de "cambio mínimo" frente a fijar
   fracciones literales que nada en este fichero necesitaba ajustar.
   `$dark`: apilamiento (D17/§1.c de la spec) -- con las estrellas
   posicionadas encima del fondo, el contenido necesita su propio
   `position: relative; z-index: 1` para no quedar debajo; en claro no hay
   estrellas, así que no hace falta y no se declara (byte a byte igual que
   antes, D1). */
const ScInner = styled.div<{ $dark: boolean }>`
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

  ${({ $dark }) =>
    $dark &&
    css`
      position: relative;
      z-index: 1;
    `}
`;

const ScBrandCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.data.space[3]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    /* La marca ocupa más ancho que una columna de enlaces (mockup: 1.4fr
       frente a 1fr): con auto-fit eso se aproxima ocupando dos pistas
       cuando hay sitio (D16: las 4 columnas de enlaces se montan siempre en
       los dos temas, así que esto ya no depende del tema). */
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
const footerLinkStyles = css`
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

const ScFooterLink = styled.a`
  ${footerLinkStyles}
`;

/* Enlace a una ruta INTERNA de este mismo sitio. Existe separado de
   ScFooterLink porque la diferencia no es de estilo sino de mecanismo: los
   destinos propios se navegan con next/link (sin recarga, con prefetch) y
   NUNCA con target blank -- ver el comentario de LEGAL_LINKS. */
const ScFooterNavLink = styled(Link)`
  ${footerLinkStyles}
`;

/* El disparador de las preferencias de cookies es un boton, no un enlace: no
   navega a ninguna parte, abre un dialogo en la misma pagina. Pintarlo como
   enlace y dejarlo como boton es lo correcto -- al reves (un ancla con
   href vacio) le mentiria al lector de pantalla sobre lo que va a pasar. El
   reset de apariencia es explicito porque GlobalStyles normaliza los
   controles de formulario pero no los desnuda del todo. */
const ScFooterButton = styled.button`
  ${footerLinkStyles}
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  cursor: pointer;
  text-align: start;
`;

/* `$dark`: mismo motivo que `ScInner` -- necesita salir por encima de las
   estrellas posicionadas. */
const ScBottomBar = styled.div<{ $dark: boolean }>`
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

  ${({ $dark }) =>
    $dark &&
    css`
      position: relative;
      z-index: 1;
    `}
`;

const ScBottomLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.data.space[4]};
`;

/* Anclas de sección (Explore, D2/D16): mismos 4 destinos que el Navbar.
   Fuera de ambos componentes porque cada uno necesita su propio par
   clave/traducción (`Common.Navigation.*`) pero NO comparten estilo -- se
   repite la lista literal en vez de extraer un módulo compartido para dos
   usos, mismo criterio de "cambio mínimo" que el resto de la entrega. */
const SECTION_LINKS = [
  { key: "story", href: "#story" },
  { key: "journey", href: "#journey" },
  { key: "features", href: "#features" },
  { key: "contact", href: "#contact" },
] as const;

/* Discover (D6/D16): Learning/Imagination/Gaming son los TÍTULOS de
   `Home.features.*` (namespace "home"), no claves de navegación nuevas --
   los tres apuntan a la misma sección `#features` (spec §7.5). */
const DISCOVER_LINKS = ["learning", "imagination", "gaming"] as const;

/*
 * Los cuatro documentos legales de la barra inferior (entrega 2026-08-04).
 * Hasta hoy eran tres anclas con target blank hacia marcadores
 * example.invalid; ahora son rutas propias, y por eso se navegan con
 * next/link.
 *
 * D19 de la spec: mantener target blank sobre una ruta PROPIA es un
 * antipatron -- rompe el boton atras, abre una pestana que el usuario no ha
 * pedido y cambia de contexto sin avisar, que es lo que WCAG 3.2.5 pide
 * evitar. El target blank se queda SOLO donde el destino de verdad sale del
 * sitio (documentacion y guias, en la columna de Recursos).
 */
const LEGAL_LINKS = [
  { key: "privacy", href: links.privacy },
  { key: "terms", href: links.terms },
  { key: "accessibility", href: links.accessibility },
  { key: "legalNotice", href: links.legalNotice },
] as const;

export function Footer(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName } = useTheme();
  const { openPreferences } = useConsent();
  const year = new Date().getFullYear();
  const isDark = themeName === "dark";

  return (
    <ScFooter $dark={isDark}>
      {isDark && <SectionBeam />}
      {isDark && (
        <ScStars aria-hidden="true">
          {FOOTER_STARS.map((star) => (
            <ScStar
              key={star.id}
              style={starVars(star)}
            />
          ))}
        </ScStars>
      )}

      <ScInner $dark={isDark}>
        <ScBrandCol>
          <ScBrandRow>
            <Logo size="1.5rem" />
            <BrandName />
          </ScBrandRow>
          <ScTagline variant="bodySm">{t("Common.Footer.tagline")}</ScTagline>
        </ScBrandCol>

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
            <ScFooterNavLink href={links.accessibility}>
              {t("Common.Footer.accessibility")}
            </ScFooterNavLink>
          </ScColumnLinks>
        </ScColumn>
      </ScInner>

      <ScBottomBar $dark={isDark}>
        <Typography
          variant="caption"
          as="span"
        >
          {t("Common.Footer.copyright", { year })}
        </Typography>
        <ScBottomLinks>
          {LEGAL_LINKS.map(({ key, href }) => (
            <ScFooterNavLink
              key={key}
              href={href}
            >
              {t(`Common.Footer.${key}`)}
            </ScFooterNavLink>
          ))}
          {/* Retirar el consentimiento tiene que ser tan facil como darlo
              (art. 7.3 RGPD por remision, y criterio expreso de la guia de
              cookies de la AEPD). Este disparador vive en el pie, que esta en
              TODAS las paginas -- la home y las cuatro legales --, asi que la
              persona puede reabrir el panel desde donde este sin tener que
              buscar. */}
          <ScFooterButton
            type="button"
            onClick={openPreferences}
          >
            {t("Common.Footer.cookiePreferences")}
          </ScFooterButton>
        </ScBottomLinks>
      </ScBottomBar>
    </ScFooter>
  );
}
