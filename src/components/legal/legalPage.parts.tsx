"use client";

import Link from "next/link";
import styled from "styled-components";
import { PRESS } from "@/motion/vocabulary";

/*
 * Piezas con estilo de las 4 páginas legales (D21/D22/D23 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md). Todo con tokens
 * `theme.data.*` -- cero colores o espaciados literales -- y legible en los
 * dos temas: ninguna pieza fija un fondo oscuro/claro propio, todas heredan
 * de `semantic.*`, que ya resuelve contra el tema activo.
 *
 * Ancho de lectura: `theme.data.grid.prose` (65ch, D21/§3 spec) en el
 * artículo entero, no solo en los párrafos -- así el índice y las cabeceras
 * de sección respetan la misma medida de lectura que el propio texto.
 */

export const ScMain = styled.main`
  max-width: ${({ theme }) => theme.data.grid.prose};
  margin-inline: auto;
  padding: ${({ theme }) => theme.data.space[7]}
    ${({ theme }) => theme.data.space[5]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding-block: ${({ theme }) => theme.data.space[8]};
  }
`;

/* transform se añade a la lista de transition (Task 9, vocabulary.PRESS): el
   hover de abajo solo cambia color -- sin movimiento que guardar tras
   PRESS.hoverGuard (punto 2 del brief) --, así que la entrada nace ya con
   los valores de PRESS, gobernando exclusivamente el press. */
export const ScBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  margin-bottom: ${({ theme }) => theme.data.space[5]};
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brandText};
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

export const ScTitle = styled.h1`
  margin: 0 0 ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.h1.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h1.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h1.lineHeight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.h1.tracking};
  color: ${({ theme }) => theme.data.semantic.text};
  text-wrap: balance;
`;

export const ScVersionMeta = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[6]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Índice de contenidos (D22): navegación por teclado real -- cada `<a>` es
   un enlace ancla nativo, sin JS de por medio, así que hereda foco/tabulación
   y el anillo global de `GlobalStyles`. */
export const ScToc = styled.nav`
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border: 1px solid ${({ theme }) => theme.data.semantic.border};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  padding: ${({ theme }) => theme.data.space[5]};
  margin-bottom: ${({ theme }) => theme.data.space[7]};
`;

export const ScTocHeading = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[3]};
  font-size: ${({ theme }) => theme.data.type.scale.overline.size};
  font-weight: ${({ theme }) => theme.data.type.scale.overline.weight};
  letter-spacing: ${({ theme }) => theme.data.type.scale.overline.tracking};
  text-transform: uppercase;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
`;

export const ScTocList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding-left: ${({ theme }) => theme.data.space[4]};
`;

export const ScTocItem = styled.li`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

/* Mismo criterio que ScBackLink, arriba: transform nace ya con los valores
   de vocabulary.PRESS (Task 9), sin guard de hover -- el hover de abajo es
   solo color. */
export const ScTocLink = styled.a`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.brandText};
  transition:
    color ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${PRESS.durationMs}ms ${PRESS.easing};

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.data.semantic.brand};
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:active {
      transform: none;
    }
  }
`;

/* `scroll-margin-top` propio (no depende del `:where(section[id])` global de
   GlobalStyles, que descuenta el navbar FIJO de la home -- este header no es
   fixed, así que no hace falta compensar nada, pero se declara un margen
   pequeño de todos modos para que el salto de ancla no pegue el título al
   borde superior del viewport). */
export const ScSection = styled.section`
  scroll-margin-top: ${({ theme }) => theme.data.space[5]};
  padding-top: ${({ theme }) => theme.data.space[7]};
  border-top: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:first-of-type {
    padding-top: 0;
    border-top: none;
  }
`;

export const ScSectionHeading = styled.h2`
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  font-size: ${({ theme }) => theme.data.type.scale.h3.size};
  font-weight: ${({ theme }) => theme.data.type.scale.h3.weight};
  line-height: ${({ theme }) => theme.data.type.scale.h3.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScParagraph = styled.p`
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[2]};
  padding-left: ${({ theme }) => theme.data.space[5]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  list-style: disc;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScListItem = styled.li`
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScDl = styled.dl`
  display: grid;
  gap: ${({ theme }) => theme.data.space[3]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScDlRow = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.data.space[1]};
  padding-bottom: ${({ theme }) => theme.data.space[3]};
  border-bottom: 1px solid ${({ theme }) => theme.data.semantic.border};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export const ScDt = styled.dt`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 700;
  color: ${({ theme }) => theme.data.semantic.text};
`;

export const ScDd = styled.dd`
  margin: 0;
  font-size: ${({ theme }) => theme.data.type.scale.body.size};
  line-height: ${({ theme }) => theme.data.type.scale.body.lineHeight};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;

/* Aviso destacado (bloque `note`): borde izquierdo de acento en vez de un
   fondo sólido -- funciona igual de bien en los dos temas sin necesitar un
   color de texto distinto al del resto del documento. */
export const ScNote = styled.div`
  padding: ${({ theme }) => theme.data.space[4]};
  margin: 0 0 ${({ theme }) => theme.data.space[4]};
  background: ${({ theme }) => theme.data.semantic.surfaceSunken};
  border-left: 3px solid ${({ theme }) => theme.data.semantic.warning};
  border-radius: ${({ theme }) => theme.data.radius.sm};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  line-height: ${({ theme }) => theme.data.type.scale.bodySm.lineHeight};
  color: ${({ theme }) => theme.data.semantic.text};

  &:last-child {
    margin-bottom: 0;
  }
`;

/* Marcador de dato pendiente (D23): mismo rol visual en los dos temas --
   fondo de acento + borde, sin depender de un color de texto especial (el
   texto sigue heredando `semantic.text`, ya verificado AA sobre las
   superficies del sistema por `semantic.test.ts`/`contrast.test.ts`). */
export const ScMark = styled.mark`
  background: color-mix(
    in oklch,
    ${({ theme }) => theme.data.semantic.warning} 30%,
    transparent
  );
  color: inherit;
  border: 1px solid
    color-mix(
      in oklch,
      ${({ theme }) => theme.data.semantic.warning} 55%,
      transparent
    );
  border-radius: ${({ theme }) => theme.data.radius.xs};
  padding: 0 0.25em;
  font-weight: 700;
  cursor: help;
`;

export const ScTableWrap = styled.div`
  /* La tabla de almacenamiento puede desbordar en móvil (5 columnas): el
     scroll horizontal vive AQUÍ, nunca en el body -- misma regla que
     cualquier tabla/bloque de código ancho del sistema. */
  overflow-x: auto;
  margin: 0 0 ${({ theme }) => theme.data.space[4]};

  &:last-child {
    margin-bottom: 0;
  }
`;

export const ScTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
`;

export const ScCaption = styled.caption`
  text-align: left;
  margin-bottom: ${({ theme }) => theme.data.space[2]};
  color: ${({ theme }) => theme.data.semantic.textSubtle};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
`;

export const ScTh = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.data.space[2]}
    ${({ theme }) => theme.data.space[3]};
  border-bottom: 2px solid ${({ theme }) => theme.data.semantic.borderStrong};
  color: ${({ theme }) => theme.data.semantic.text};
  white-space: nowrap;
`;

export const ScTd = styled.td`
  padding: ${({ theme }) => theme.data.space[2]}
    ${({ theme }) => theme.data.space[3]};
  border-bottom: 1px solid ${({ theme }) => theme.data.semantic.border};
  color: ${({ theme }) => theme.data.semantic.textMuted};
`;
