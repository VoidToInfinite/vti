"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { EyeCornerMark } from "@/components/eye/EyeCornerMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { useScrolled } from "@/hooks/useScrolled";

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

/*
 * BUG REAL encontrado al verificar el arreglo de tamano del Logo, no
 * hipotetico: color: theme.semantic.text es OBLIGATORIO aqui, no cosmetico.
 *
 * Logo.tsx pinta con `fill: currentColor` y no fija su propio `color` --
 * depende de heredarlo por CSS puro del ancestro mas cercano que lo declare.
 * Sin esta linea, ese ancestro era `body` (via GlobalStyles, `a { color:
 * inherit }` en cascada), y `body` resuelve su color contra el ThemeProvider
 * AMBIENTAL (raiz de la pagina), no contra `barTheme` (el tema oscuro que
 * este componente fuerza mientras la barra es transparente, ver el comentario
 * de barTheme mas abajo).
 *
 * Los dos temas coinciden salvo en UNA combinacion: tema ambiental CLARO +
 * barra sin scroll. Ahi `body` resuelve a oklch(0.32 0 286) (texto oscuro del
 * tema claro) mientras barTheme fuerza oscuro (blanco): el icono heredaba el
 * color equivocado y se leia casi invisible sobre el ojo negro del hero.
 * Verificado en navegador real, reproducido y confirmado con las cuatro
 * combinaciones tema x scroll.
 *
 * BrandName (el span de al lado) NO tenia este problema porque su propio
 * componente redeclara `color: theme.semantic.text` leyendo el contexto de
 * ESTE ThemeProvider -- un arreglo local a BrandName, no sistemico: cualquier
 * otro hijo que dependiera de currentColor (Logo, y cualquiera que se anada
 * despues) seguia expuesto. Fijar el color aqui, en el contenedor, cierra el
 * problema para todos los descendientes a la vez.
 */
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

export function Navbar(): ReactElement {
  const scrolled = useScrolled(8);

  /*
   * (antes) barTheme forzaba basicDarkTheme mientras la barra era
   * transparente, razonando que estaba flotando sobre el hero y el hero era
   * negro en los dos temas -- si no, en tema claro la marca y los controles
   * resolvian a casi negro sobre la ilustracion y desaparecian. Esa premisa
   * dejo de ser cierta: el hero en tema claro monta la composicion "Aura"
   * (pastel, ver Hero.tsx / HeroBackdrop.tsx), no el ojo negro. Si barTheme
   * siguiera forzando oscuro, la barra transparente pintaria la marca y los
   * controles en BLANCO sobre ese pastel -- exactamente el fallo que
   * task/lessons.md documenta para currentColor, en espejo (alli sobrevivia
   * el tema oscuro forzado; aqui seria el tema oscuro forzado el que
   * rompe).
   *
   * La superficie que hay detras de la barra ahora COINCIDE SIEMPRE con el
   * tema de la pagina -- negra en oscuro, pastel en claro -- en los DOS
   * estados de scroll (con cristal o sin el): no hay ninguna combinacion en
   * la que barra y fondo diverjan. Por eso ya no hace falta un ThemeProvider
   * local que fuerce ni recalcule nada: los estilos de este componente
   * (`theme.data...` en ScHeader, ScNav, ScBrandLink) resuelven directamente
   * contra el ThemeProvider AMBIENTAL de la pagina, que ya expone el mismo
   * `{ data: themes[themeName] }` que este bloque construia a mano.
   *
   * Quitar el proveedor anidado no es solo simplificar: cierra la clase de
   * bug completa de la leccion del 2026-07-26 (dos ThemeProvider que pueden
   * divergir y currentColor heredando del que no toca), en vez de solo
   * corregir el sintoma de este componente -- con un unico ThemeProvider en
   * el arbol no queda ningun segundo arbol de tema contra el que algo pueda
   * divergir. `ScBrandLink` (mas abajo) sigue fijando su propio `color`
   * explicito: ya no es la unica defensa contra ese bug, pero sigue siendo
   * la que ancla a cualquier descendiente que dependa de `currentColor`
   * (hoy `Logo`), y quitarla reabriria el problema si en el futuro volviera
   * a haber divergencia.
   */

  return (
    <ScHeader data-scrolled={scrolled}>
      <ScNav>
        <ScBrandLink href="/">
          <EyeCornerMark visible={scrolled} />
          {/* 1.5rem, no 1rem: a 1rem (16x18px) los trazos finos del
              dibujo (cabeza + brazos en V) no se distinguen. El valor
              anterior era una reduccion defensiva de una sesion previa
              a la correccion del viewBox, cuando el icono se renderizaba
              roto y gigante (167x184px) y encogerlo era lo unico que
              evitaba que rompiera el layout -- no una calibracion sobre
              el resultado ya arreglado. Con el viewBox centrado y el
              tamano resuelto de verdad por CSS, 1.5rem (24x26px) es el
              valor con el que se diseno originalmente este atomo. */}
          <Logo size="1.5rem" />
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
