"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

/*
 * Enlace "saltar al contenido" (WCAG 2.4.1, Bypass Blocks): destino
 * `#main`, el landmark principal que cada ruta declara (`app/page.tsx`,
 * `LegalDocument.tsx`, `NotFoundContent.tsx` -- ver el `id="main"
 * tabIndex={-1}` que las tres añaden). `tabIndex={-1}` en el destino es lo
 * que lo hace focalizable de forma fiable: sin él, un navegador puede
 * desplazar el scroll hasta el elemento pero dejar el foco real en el
 * `<body>`, sin ningún indicador visible de dónde aterrizó el usuario.
 *
 * PRIMER elemento enfocable de la página: `app/providers.tsx` lo monta
 * antes que `{children}`, dentro de `I18nProvider` (necesita traducirse) y
 * de `ThemeProvider` (necesita tokens de tema) -- ninguno de los
 * proveedores que lo envuelven ahí (`StyledComponentsRegistry`,
 * `ThemeProvider`, `I18nProvider`) renderiza un nodo DOM propio, así que en
 * el árbol real sigue siendo el primer hijo focalizable de `<body>`, aunque
 * el fichero fuente no sea `app/layout.tsx` (que es Server Component y no
 * puede leer tema/idioma).
 *
 * Oculto SOLO visualmente hasta `:focus-visible`, nunca del árbol de
 * accesibilidad: `display: none`/`visibility: hidden` lo sacarían también
 * del recorrido por tabulación, justo lo contrario de lo que este átomo
 * existe para conseguir. `transform` es la ÚNICA propiedad animada (regla
 * 18 de RULES.md) y lo saca del viewport por completo en reposo -- no solo
 * `opacity` -- para que tampoco intercepte un click de ratón por accidente
 * mientras está "oculto". El anillo de :focus-visible lo pone gratis
 * GlobalStyles (`:where(a, ...):focus-visible { outline: ... }`, aplica a
 * cualquier `<a>`): este componente no declara ningún halo propio.
 */
const ScSkipLink = styled.a`
  position: fixed;
  top: ${({ theme }) => theme.data.space[3]};
  left: ${({ theme }) => theme.data.space[3]};
  z-index: ${({ theme }) => theme.data.zIndex.modal};
  padding: ${({ theme }) => theme.data.space[3]}
    ${({ theme }) => theme.data.space[5]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  background: ${({ theme }) => theme.data.semantic.brandSolid};
  color: ${({ theme }) => theme.data.semantic.onBrand};
  font-weight: 600;
  box-shadow: ${({ theme }) => theme.data.elevation[3]};
  transform: translateY(-150%);
  transition: transform ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  &:focus-visible {
    transform: translateY(0);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export function SkipLink(): ReactElement {
  const { t } = useTranslation("common");
  return <ScSkipLink href="#main">{t("Common.SkipLink.label")}</ScSkipLink>;
}
