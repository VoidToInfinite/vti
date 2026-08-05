"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";

/*
 * Cabecera propia de las páginas legales (D20 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md): el `Navbar` de la home
 * queda descartado a propósito, no por omisión.
 *
 * Motivo, verificado leyendo el código real y no de memoria: `Navbar.tsx`
 * está acoplado al hero por dos hooks (`useStage` para su animación de
 * entrada encadenada con la coreografía del hero, y `useNavDetach` para el
 * despegue al hacer scroll sobre las secciones de la home) y monta 4 anclas
 * de sección -- `#story`/`#journey`/`#features`/`#contact`
 * (`Navbar.tsx:406-411`) -- que en `/privacidad`, `/terminos`,
 * `/accesibilidad` o `/aviso-legal` no existen: esas páginas no montan
 * `Story`/`Journey`/`Features`/`Contact`. Reusar el `Navbar` aquí produciría
 * 4 anclas muertas, exactamente el defecto que el propio `Footer` arrastró
 * durante dos entregas y que su código sigue documentando
 * (`Footer.tsx:31-41`), y además dependería de dos hooks pensados para una
 * página con hero, en una página que no tiene ninguno.
 *
 * `LegalHeader` es deliberadamente sobrio: marca enlazada a `/`, selector de
 * idioma y conmutador de tema -- ni anclas de sección, ni despegue al hacer
 * scroll, ni cristal esmerilado. El `Footer` de la home SÍ se reutiliza tal
 * cual en las 4 páginas legales (es autónomo, spec D20): esta cabecera es la
 * única pieza de navegación que necesitaba un sustituto.
 */

const ScHeader = styled.header`
  border-bottom: 1px solid ${({ theme }) => theme.data.semantic.border};
`;

const ScInner = styled.div`
  max-width: ${({ theme }) => theme.data.grid.containerMax};
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[4]};
  height: var(--nav-height);
  padding: 0 ${({ theme }) => theme.data.space[4]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 0 ${({ theme }) => theme.data.space[6]};
  }
`;

/* Mismo motivo que `ScBrandLink` de `Navbar.tsx`: `Logo` pinta con
   `fill: currentColor` y depende de heredar un `color` explícito del
   ancestro más cercano -- sin esto, heredaría de `body` vía la cascada de
   `GlobalStyles` (`a { color: inherit }`), que en este componente da la
   misma superficie que `semantic.text` de todas formas (no hay tema forzado
   aquí, a diferencia del Navbar sobre el hero), pero se fija explícito para
   no depender de esa coincidencia. */
const ScBrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: 1.15rem;
  color: ${({ theme }) => theme.data.semantic.text};
`;

const ScActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
`;

export function LegalHeader(): ReactElement {
  return (
    <ScHeader>
      <ScInner>
        <ScBrandLink href="/">
          <Logo size="1.5rem" />
          <BrandName />
        </ScBrandLink>
        <ScActions>
          <LanguageSelector />
          <ThemeToggle />
        </ScActions>
      </ScInner>
    </ScHeader>
  );
}
