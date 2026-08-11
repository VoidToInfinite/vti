"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Typography } from "@/components/ui/Typography/Typography";
import { PRESS } from "@/motion/vocabulary";

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
 * hover/foco, `motion.duration.fast` para la transicion de color, y las
 * primitivas de press de `vocabulary.PRESS` -- transform a
 * `PRESS.durationMs`/`PRESS.easing` en `:active`, escala
 * `PRESS.activeScale`, mismo candado de `prefers-reduced-motion` -- que
 * `legalPage.parts.tsx` ya adopto en Task 9) para que la experiencia sea
 * consistente en todo el sitio, sin acoplar dos categorias de componentes
 * que hoy se mantienen deliberadamente separadas. `PRESS` SI se importa
 * directo de `src/motion/vocabulary.ts`, sin duplicar su valor: es
 * vocabulario transversal del sistema de movimiento, no una pieza propiedad
 * de la categoria `legal` -- misma frontera que separa `theme.data.motion.*`
 * (compartido) de los componentes que lo consumen.
 */
const ScBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  margin-top: ${({ theme }) => theme.data.space[5]};
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap. */
  touch-action: manipulation;
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

export function NotFoundContent(): ReactElement {
  const { t } = useTranslation("common");
  return (
    // id="main" + tabIndex={-1}: destino del SkipLink (Task 2), mismo
    // contrato que app/page.tsx/LegalDocument.tsx -- ver el docblock de
    // SkipLink.tsx para el porque del -1.
    <main
      id="main"
      tabIndex={-1}
    >
      {/* Task 3 (tres cierres pequeños, 2026-08-10): el h1 de bloque pelado
          quedaba a tamaño de reset global (`GlobalStyles.tsx`, regla
          `h1..h6 { font-size: 1em }`), es decir, ilegible como titular --
          heredaba el font-size del <main>, sin ningún override propio. El
          arreglo NO toca el reset global (regla compartida por todo el
          sitio, fuera del alcance de esta tarea): `Typography` ya resuelve
          este mismo conflicto en las cuatro secciones de la home
          (`Contact.tsx`/`Features.tsx`, variant="h2"/"h3") porque su regla
          de clase (`.sc-xxxx`) tiene más especificidad que el selector de
          tipo `h1` del reset, así que gana la cascada sin `!important` y sin
          `as` explícito -- `variant="h1"` ya resuelve por defecto al
          elemento `<h1>` real (`defaultElement`, `Typography.tsx`), mismo
          heading semántico que antes. */}
      <Typography variant="h1">{t("notFound.title")}</Typography>
      <p>{t("notFound.message")}</p>
      <ScBackLink href="/">{t("notFound.backToHome")}</ScBackLink>
    </main>
  );
}
