"use client";

import { useMemo, type ReactElement } from "react";
import Link from "next/link";
import styled, { ThemeProvider } from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { EyeCornerMark } from "@/components/eye/EyeCornerMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { useScrolled } from "@/hooks/useScrolled";
import { useTheme } from "@/theme/ThemeProvider";
import { basicDarkTheme, themes } from "@/theme/themes";

// El glass es el único uso sancionado de glassmorphism del sistema (§13.2 de
// la spec): reservado a capas que flotan sobre contenido en scroll (nav
// on-scroll, modal, sheet, toast), nunca en superficies estáticas. Por eso
// arranca transparente sobre el hero y solo pasa a cristal esmerilado cuando
// `data-scrolled` es true — el contraste con el estado transparente es lo
// que justifica el efecto.
//
// `fixed`, no `sticky`: en flujo, la barra ocupaba su propia franja de 3,5rem
// por encima del hero, así que «transparente» significaba transparente sobre
// el fondo del tema (un gris en oscuro, casi blanco en claro) y no sobre la
// composición del ojo. Fuera de flujo, la barra flota de verdad sobre el hero
// desde el primer píxel, que es lo que el estado transparente existe para
// conseguir. Las secciones siguientes pasan por debajo al scrollear — para
// eso está el cristal, y `scroll-margin-top` en GlobalStyles compensa los
// saltos a anclas.
const ScHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.data.zIndex.stickyNav};
  background: transparent;
  border-bottom: 1px solid transparent;
  transition:
    background-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    border-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    backdrop-filter ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  &[data-scrolled="true"] {
    background: ${({ theme }) => theme.data.glass.bg};
    /* -webkit- primero: Safari (incl. iOS) solo reconoce el prefijo; el
       backdrop-filter sin prefijo lo sobrescribe donde ambos existen. Si el
       navegador no soporta ninguno de los dos, la capa sigue siendo legible
       porque glass.bg ya es semitransparente por sí solo — no hay fallback
       de texto ilegible. */
    -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
    backdrop-filter: ${({ theme }) => theme.data.glass.blur};
    border-bottom: ${({ theme }) => theme.data.glass.border};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ScNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[4]};
  /* La misma variable que descuenta el Hero (ver GlobalStyles): si la banda
     cambia de alto, las dos medidas cambian juntas. */
  height: var(--nav-height);
  padding: 0 ${({ theme }) => theme.data.space[4]};

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 0 ${({ theme }) => theme.data.space[6]};
  }
`;

const ScBrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  font-size: 1.15rem;
`;

const ScActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[3]};
`;

export function Navbar(): ReactElement {
  const scrolled = useScrolled(8);
  const { themeName } = useTheme();

  /*
   * Mientras la barra es transparente está flotando sobre el hero, que es
   * negro en los dos temas: ahí sus tokens tienen que ser los del tema oscuro
   * o en tema claro la marca y los controles resuelven a casi negro sobre la
   * ilustración y desaparecen (mismo tratamiento que el propio Hero). En
   * cuanto aparece el cristal, la barra vuelve al tema ambiente: el panel
   * esmerilado ya es del color del tema y el contenido de debajo también.
   *
   * El umbral es el MISMO que el del cristal a propósito — un solo estado,
   * `scrolled`, gobierna fondo y colores, así que no hay ventana en la que la
   * barra sea de un tema y su fondo del otro.
   */
  const barTheme = useMemo(
    () => ({ data: scrolled ? themes[themeName] : basicDarkTheme }),
    [scrolled, themeName],
  );

  return (
    <ThemeProvider theme={barTheme}>
      <ScHeader data-scrolled={scrolled}>
        <ScNav>
          <ScBrandLink href="/">
            <EyeCornerMark visible={scrolled} />
            <Logo size="1.5rem" />
            <BrandName />
          </ScBrandLink>
          <ScActions>
            <LanguageSelector />
            <ThemeToggle />
          </ScActions>
        </ScNav>
      </ScHeader>
    </ThemeProvider>
  );
}
