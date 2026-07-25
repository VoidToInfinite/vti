"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { EyeCornerMark } from "@/components/eye/EyeCornerMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { useScrolled } from "@/hooks/useScrolled";

// El glass es el único uso sancionado de glassmorphism del sistema (§13.2 de
// la spec): reservado a capas que flotan sobre contenido en scroll (nav
// on-scroll, modal, sheet, toast), nunca en superficies estáticas. Por eso
// arranca transparente sobre el hero y solo pasa a cristal esmerilado cuando
// `data-scrolled` es true — el contraste con el estado transparente es lo
// que justifica el efecto.
const ScHeader = styled.header`
  position: sticky;
  top: 0;
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
  height: 3.5rem;
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

  return (
    <ScHeader data-scrolled={scrolled}>
      <ScNav>
        <ScBrandLink href="/">
          <EyeCornerMark visible={scrolled} />
          <BrandName />
        </ScBrandLink>
        <ScActions>
          <LanguageSelector />
          <ThemeToggle />
        </ScActions>
      </ScNav>
    </ScHeader>
  );
}
