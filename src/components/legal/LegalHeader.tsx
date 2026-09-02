"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { navLocale } from "@/config/navigation";
import { routePath } from "@/config/site";

/*
 * Cabecera propia de las páginas legales (D20 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md): el `Navbar` de la home
 * queda descartado a propósito, no por omisión.
 *
 * Motivo, verificado leyendo el código real y no de memoria: `Navbar.tsx`
 * está acoplado a `useNavDetach` para el despegue al hacer scroll sobre las
 * secciones de la home, y monta 4 anclas de sección --
 * `#story`/`#journey`/`#features`/`#contact` (`Navbar.tsx:406-411`) -- que en
 * `/privacidad` ni en `/aviso-legal` existen: esas páginas no montan
 * `Story`/`Journey`/`Features`/`Contact`. Reusar el `Navbar` aquí produciría
 * 4 anclas muertas, exactamente el defecto que el propio `Footer` arrastró
 * durante dos entregas y que su código sigue documentando
 * (`Footer.tsx:31-41`), y además dependería de un hook pensado para el
 * scroll de una página con secciones, en una página que no tiene ninguna.
 * (Hasta 2026-08-11, `Navbar.tsx` dependía además de `useStage()` para su
 * animación de entrada encadenada con la coreografía del hero; ese hook se
 * retiró del repo entero en la Task 27 del plan premium, sin cambiar esta
 * decisión: las anclas muertas ya bastaban por sí solas.)
 *
 * `LegalHeader` es deliberadamente sobrio: marca enlazada a `/`, selector de
 * idioma y conmutador de tema -- ni anclas de sección, ni despegue al hacer
 * scroll, ni cristal esmerilado. El `Footer` de la home SÍ se reutiliza tal
 * cual en las dos páginas legales (es autónomo, spec D20): esta cabecera es
 * la única pieza de navegación que necesitaba un sustituto.
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
  /* El peldaño type.scale.wordmark (crítica externa #15, hallazgo C6): este
     1.15rem estaba escrito byte a byte aquí y en el ScBrandLink de Navbar.tsx,
     dos cabeceras sin saber la una de la otra. Es el peldaño del rótulo de
     marca, no un rango de titular -- su docblock en theme/tokens/type.ts
     explica por qué no se funde con h5 pese a estar a 1,02x. Navbar.tsx queda
     fuera del alcance de este cambio y sigue con su literal.

     Sin comillas invertidas en este comentario a propósito: vive DENTRO del
     template literal de styled-components, donde una sola cerraría el
     template (lección reincidente de task/lessons.md, 2026-07-31 y
     2026-08-16). */
  font-size: ${({ theme }) => theme.data.type.scale.wordmark.size};
  color: ${({ theme }) => theme.data.semantic.text};
`;

const ScActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
`;

export function LegalHeader(): ReactElement {
  /* El idioma sale del i18n del ÁRBOL (el provider de `/en/*` monta un
     `cloneInstance` con `lng: "en"`), nunca de la instancia de módulo, cuyo
     idioma no cambia por ruta. Crítica #12, P0: el logotipo con `href="/"`
     era una de las dos salidas de las legales inglesas que expulsaban al
     castellano — la ola H hizo la navegación consciente del idioma y esta
     cabecera usa el mismo camino (`routePath` + `navLocale`, sin literales
     "/en"). */
  const { i18n } = useTranslation();
  return (
    <ScHeader>
      <ScInner>
        <ScBrandLink
          href={routePath("home", navLocale(i18n.language))}
          prefetch={false}
        >
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
