"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { useReveal } from "@/hooks/useReveal";
import { links } from "@/config/links";
import {
  CONTACT_CARD_BORDER,
  CONTACT_CARD_GRADIENT,
  CONTACT_CARD_SHADOW,
  CONTACT_CHIP_BG,
  CONTACT_CTA_HOVER_SHADOW,
  CONTACT_FIGURE_FLOAT_MS,
  CONTACT_FIGURE_HEIGHT,
  CONTACT_FIGURE_LEFT,
  CONTACT_FIGURE_SHADOW,
  CONTACT_FIGURE_SIZES,
  CONTACT_FIGURE_TOP,
  CONTACT_FLOAT_AMPLITUDE,
  CONTACT_RING_A_BORDER,
  CONTACT_RING_A_RIGHT,
  CONTACT_RING_A_SIZE,
  CONTACT_RING_B_BORDER,
  CONTACT_RING_B_RIGHT,
  CONTACT_RING_B_SIZE,
  CONTACT_RING_HALO_GRADIENT,
  CONTACT_RING_HALO_RIGHT,
  CONTACT_RING_HALO_SIZE,
  CONTACT_TITLE_ACCENT_GRADIENT,
} from "./contact.layers";

/*
 * Última sección de tema claro (spec §7.4, mockup `#contact` L212-238):
 * tarjeta con degradado pastel, chip de email + CTA a la izquierda, figura
 * que saluda con anillos concéntricos decorativos a la derecha en ≥ md.
 * `Socials` NO vive aquí (spec §7.5: se muda al footer, que la reutiliza tal
 * cual con los enlaces reales del repo).
 */
const ScContact = styled.section`
  padding: ${({ theme }) => theme.data.space[9]}
    ${({ theme }) => theme.data.space[5]};
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
`;

/*
 * Tarjeta (mockup L213): borde/degradado/sombra VERBATIM en
 * `contact.layers.ts` (D10 — no son roles semánticos, son literales de esta
 * composición). `border-radius`/`padding`/`gap` SÍ coinciden con los tokens
 * del sistema (`radius["2xl"]`, `space[6]`) porque el propio mockup los
 * declara con `var(--radius-2xl)`/`var(--space-6)` — no hay conversión que
 * hacer, coinciden con los nuestros por definición.
 *
 * `overflow: hidden` contiene los anillos decorativos y la figura, que
 * sobresalen del marco de la tarjeta (mismo motivo que `ScFrame` en
 * `eye.parts.tsx`). El reveal (opacity/translateY) vive en ESTE elemento:
 * una sola unidad de entrada para toda la tarjeta, igual que `ScContent` en
 * `Story.tsx`.
 */
const ScCard = styled.div`
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius["2xl"]};
  border: 1px solid ${CONTACT_CARD_BORDER};
  background: ${CONTACT_CARD_GRADIENT};
  box-shadow: 0 18px 44px ${CONTACT_CARD_SHADOW};
  padding: ${({ theme }) => theme.data.space[6]};

  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized};

  &[data-revealed="true"] {
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    opacity: 1;
    transform: none;
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    grid-template-columns: 1.4fr 1fr;
  }
`;

const ScLeft = styled.div`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
`;

/* Mismo patrón que `ScKicker` en `Hero.tsx`: las mayúsculas se hacen por CSS
   (no en el JSON) para que el nombre accesible conserve la caja natural de
   la traducción, y el color de marca gana la cascada sin `&&` porque
   `styled(Typography)` inyecta su clase después de `ScTypography` (medido
   en este repo). */
const ScKicker = styled(Typography)`
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.brandText};
`;

/* Degradado de texto estático (mockup no anima este span, a diferencia del
   "ToInfinite" del hero) — ver `CONTACT_TITLE_ACCENT_GRADIENT`. */
const ScAccent = styled.span`
  background-image: ${CONTACT_TITLE_ACCENT_GRADIENT};
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;

  /* Red de seguridad: sin soporte de background-clip: text el texto no
     puede quedar transparente e invisible (mismo criterio que
     gradientTextClip en BrandName.tsx). */
  @supports not (background-clip: text) {
    background-image: none;
    color: ${({ theme }) => theme.data.semantic.brandText};
    -webkit-text-fill-color: ${({ theme }) => theme.data.semantic.brandText};
  }
`;

/* `var(--text-secondary)` del mockup -> `semantic.textMuted` (ver el mapeo
   de rol documentado en `contact.layers.ts`). */
const ScBody = styled(Typography)`
  color: ${({ theme }) => theme.data.semantic.textMuted};
  text-wrap: pretty;
`;

const ScRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  margin-block-start: ${({ theme }) => theme.data.space[5]};
`;

/* Chip de email (mockup L219-222): fondo translúcido bespoke
   (`CONTACT_CHIP_BG`, D10), borde `semantic.border` (rol existente). */
const ScChip = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  min-width: 280px;
  height: 48px;
  padding-inline: ${({ theme }) => theme.data.space[4]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  background: ${CONTACT_CHIP_BG};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

/* GlobalStyles fuerza `svg { width: 100% }` (spec 5.1/lección Logo): la
   regla de este componente gana la cascada por especificidad de clase, así
   que el icono SÍ mide 16px en vez de estirarse al 100% del chip. */
const ScChipIcon = styled.svg`
  flex: none;
  width: 16px;
  height: 16px;
`;

/*
 * CTA (mockup L223): anchor propio, NO un `styled(Button)`. La lección de
 * `task/lessons.md` (2026-07-26, "`background: valor` en :hover resetea
 * background-image") documenta que la variante `solid` de `Button.tsx`
 * declara `&:hover:not(:disabled) { background: color-mix(...) }` — la
 * propiedad ABREVIADA, que resetearía este degradado de fondo en cuanto se
 * compusiera encima. Un anchor propio evita el conflicto por completo en
 * vez de tener que reafirmar la sub-propiedad con el mismo selector: cero
 * herencia de un hover que este CTA no quiere.
 *
 * Degradado con los tokens de paleta (`primary[600]`/`secondary[600]`), NO
 * un literal: el mockup referencia `var(--primary-600)`/`var(--secondary-600)`
 * de su propio design system, que resuelven exactamente a esos roles en el
 * nuestro (ver el mapeo documentado en `contact.layers.ts`).
 *
 * Transición limitada a transform/box-shadow/filter (spec §7.4): el hover
 * NUNCA toca `background`, así que el degradado no se repite aquí.
 */
const ScCta = styled.a`
  display: inline-flex;
  align-items: center;
  height: 48px;
  padding-inline: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  background-image: linear-gradient(
    100deg,
    ${({ theme }) => theme.data.palette.primary[600]},
    ${({ theme }) => theme.data.palette.secondary[600]}
  );
  color: ${({ theme }) => theme.data.semantic.onBrand};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 600;
  transition:
    transform ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    box-shadow ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    filter ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${CONTACT_CTA_HOVER_SHADOW};
    filter: brightness(1.05);
  }
  &:active {
    transform: scale(0.98);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover,
    &:active {
      transform: none;
    }
  }
`;

/* Anillos concéntricos + figura (mockup L226-236): solo ≥ md, como la
   propia columna derecha de la tarjeta (spec §7.4). Ocultos por completo
   debajo para no romper el flujo de una columna (mismo criterio que
   Journey, spec §7.2). */
const ScRings = styled.div`
  display: none;
  position: absolute;
  inset: 0;
  pointer-events: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: block;
  }
`;

const ScRingHalo = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_HALO_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_HALO_SIZE};
  height: ${CONTACT_RING_HALO_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: ${CONTACT_RING_HALO_GRADIENT};
`;

const ScRingA = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_A_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_A_SIZE};
  height: ${CONTACT_RING_A_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid ${CONTACT_RING_A_BORDER};
`;

const ScRingB = styled.div`
  position: absolute;
  inset-inline-end: ${CONTACT_RING_B_RIGHT};
  inset-block-start: 50%;
  transform: translateY(-50%);
  width: ${CONTACT_RING_B_SIZE};
  height: ${CONTACT_RING_B_SIZE};
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid ${CONTACT_RING_B_BORDER};
`;

const ScFigureWrap = styled.div`
  display: none;
  position: relative;
  height: 100%;
  min-height: 300px;
  pointer-events: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: block;
  }
`;

/* Flotación (mockup `vtiFloat4`, `contact.layers.ts`): SOLO transform, con
   guard reduced-motion explícito (no basta el colapso global de
   `GlobalStyles`, lección 2026-07-25 en `BrandName.tsx`/`ctaGlow`: con
   `animation-iteration-count: 1 !important` forzado, una animación
   infinita corre una vez y deja un frame arbitrario, no el último). */
const contactFloat = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(${CONTACT_FLOAT_AMPLITUDE});
  }
`;

const ScFigure = styled.img`
  position: absolute;
  inset-inline-start: ${CONTACT_FIGURE_LEFT};
  inset-block-start: ${CONTACT_FIGURE_TOP};
  width: auto;
  max-width: none;
  height: ${CONTACT_FIGURE_HEIGHT};
  filter: drop-shadow(0 12px 32px ${CONTACT_FIGURE_SHADOW});

  @media (prefers-reduced-motion: no-preference) {
    animation: ${contactFloat} ${CONTACT_FIGURE_FLOAT_MS}ms ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: none;
  }
`;

export function Contact(): ReactElement {
  const { t } = useTranslation("home");
  const { ref: revealRef, revealed } = useReveal<HTMLDivElement>();

  return (
    <ScContact
      id="contact"
      aria-labelledby="contact-title"
    >
      <ScCard
        ref={revealRef}
        data-revealed={revealed}
      >
        <ScLeft>
          <ScKicker variant="overline">{t("Home.contact.kicker")}</ScKicker>
          <Typography
            variant="h2"
            id="contact-title"
          >
            {t("Home.contact.titleLead")}{" "}
            <ScAccent>{t("Home.contact.titleAccent")}</ScAccent>
          </Typography>
          <ScBody variant="body">
            {t("Home.contact.body")}
            <br />
            {t("Home.contact.bodySecond")}
          </ScBody>
          <ScRow>
            <ScChip>
              <ScChipIcon
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="2"
                />
                <path d="M22 6l-10 7L2 6" />
              </ScChipIcon>
              <span>{t("Home.contact.email")}</span>
            </ScChip>
            <ScCta
              href={links.email}
              aria-label={t("Home.contact.ctaAria")}
            >
              {t("Home.contact.cta")}
            </ScCta>
          </ScRow>
        </ScLeft>
        <ScRings aria-hidden="true">
          <ScRingHalo />
          <ScRingA />
          <ScRingB />
        </ScRings>
        <ScFigureWrap>
          <ScFigure
            src="/figures/contact-waving-1024.webp"
            srcSet="/figures/contact-waving-640.webp 640w, /figures/contact-waving-1024.webp 1024w"
            sizes={CONTACT_FIGURE_SIZES}
            alt={t("Home.contact.figureAlt")}
            loading="lazy"
            decoding="async"
          />
        </ScFigureWrap>
      </ScCard>
    </ScContact>
  );
}
