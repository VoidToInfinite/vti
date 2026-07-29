"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { EyeCornerMark } from "@/components/eye/EyeCornerMark";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { useScrolled } from "@/hooks/useScrolled";
import { useStage } from "@/motion/StageProvider";
import { useTheme } from "@/theme/ThemeProvider";

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
/*
 * Entrada del navbar en la carga (tarea C4, spec §7.4): `opacity` +
 * `translateY(-8px) -> 0`, con `motion.duration.slow`/`easing.decelerate` --
 * la escala de movimiento de la casa, no una constante propia de la
 * coreografía del hero, porque esto ES una transición de interfaz normal
 * (aparición de la barra), no parte de la coreografía en sí (mismo criterio
 * que documenta HERO_CHROME_OFFSET_MS en hero.transition.ts).
 *
 * CONVIVENCIA con la `transition` que ScHeader YA declaraba (background-
 * color/border-color/backdrop-filter, para el cristal de `data-scrolled`):
 * se añaden `opacity`/`transform` como dos entradas MÁS de la misma
 * propiedad `transition` (longhand con lista separada por comas), no se
 * sustituye. `transition` acepta una lista de <duración, timing-function>
 * por propiedad; no es el caso de la lección de `task/lessons.md` sobre
 * `background: valor` en :hover (esa es una propiedad ABREVIADA que resetea
 * sub-propiedades no mencionadas) -- aquí no hay abreviatura ni reseteo,
 * cada propiedad listada anima con SU PROPIA duración/easing sin pisar a
 * las demás.
 *
 * CONTEXTO DE APILAMIENTO: `position: fixed` + `z-index` distinto de `auto`
 * YA crea un contexto de apilamiento en ScHeader por sí solo (spec CSS,
 * independiente de `transform`); `z-index: stickyNav` sigue decidiendo el
 * orden de ScHeader FRENTE A SUS HERMANOS (Hero y el resto de secciones) tal
 * cual lo hacía antes de esta tarea. Añadir `transform` aquí NO cambia esa
 * relación con el resto de la página: solo añade un contexto de apilamiento
 * ANIDADO para los HIJOS de ScHeader (el logo, los CTA de la barra), que no
 * tienen ningún z-index propio que necesite escapar de él. Verificado
 * leyendo la especificación de contextos de apilamiento del CSS Positioned
 * Layout Module: un elemento ya aislado por `position: fixed` + `z-index`
 * no cambia su posición en el árbol de apilamiento del documento por ganar
 * además una propiedad de `transform`.
 */
const ScHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.data.zIndex.stickyNav};
  background: transparent;
  border-bottom: 1px solid transparent;
  opacity: 1;
  transform: translateY(0);
  transition:
    background-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    border-color ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    backdrop-filter ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};

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

  /*
   * Estado ANTES de que la fase de página llegue a "chrome" (spec §7.4).
   * SOLO opacity/transform (regla de movimiento de la casa): nunca
   * display:none, visibility:hidden ni aria-hidden -- el navbar tiene que
   * seguir en el orden de tabulación y visible para lectores de pantalla
   * durante este tramo (ver el comentario de accesibilidad en Navbar(), más
   * abajo). Un elemento con opacity 0 sigue siendo focalizable y anunciado;
   * solo dejaría de leerse su contraste visual, y el tramo dura como mucho
   * STAGE_FALLBACK_MS (~1.5s) antes de que la red de seguridad de
   * StageProvider lo resuelva de todos modos.
   */
  &[data-intro="pending"] {
    opacity: 0;
    transform: translateY(-8px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    /* Visible de inmediato, sin animación (spec §7.4): GlobalStyles colapsa
       animation-duration pero esto es una transition, no una @keyframes --
       con transition: none de la línea de arriba ya no hay ninguna
       interpolación en marcha, pero el estado ESTÁTICO seguiría siendo
       opacity 0 mientras la fase no llegara a "chrome" (que bajo
       StageProvider en reduce sí llega directo a "settled", pero solo
       DESPUÉS de un efecto -- hay un primer render, antes de ese efecto, en
       el que la fase todavía es "backdrop"). Forzar aquí el estado final
       por CSS, sin depender de en qué fase esté React todavía, cierra esa
       ventana de raza sin necesitar ningún ajuste de timing en JS. */
    opacity: 1;
    transform: translateY(0);

    &[data-intro="pending"] {
      opacity: 1;
      transform: translateY(0);
    }
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

/*
 * Enlaces de sección (spec 2026-07-28-landing-v2-secciones-design.md §7.6,
 * mockup `Landing v2.dc.html` L41-45): SOLO en tema claro (sus destinos
 * -Story/Journey/Features/Contact- solo existen ahí, gate `HomeSections`
 * D3) y SOLO ≥ md (mockup: barra angosta en breakpoints menores). `<div>`,
 * no un segundo `<nav>`: `ScNav` ya es el elemento `nav` de la barra: anidar
 * un landmark de navegación dentro de otro sería un `nav` redundante para
 * lectores de pantalla, y la spec pide los enlaces "dentro del actual
 * ScNav", no un landmark propio.
 *
 * Oculto por `display: none` bajo `md` (no desmontado): igual que el resto
 * del navbar, no cambia el orden de tabulación de forma condicional al
 * viewport -- la propia condicion de tema si desmonta el bloque entero
 * (sin ThemeProvider anidado, useTheme() ya resuelve contra el tema
 * ambiental de la pagina).
 */
const ScNavLinks = styled.div`
  display: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[5]};
  }
`;

/* Texto pequeño, `textMuted` en reposo (mismo rol que el resto de enlaces
   secundarios del sitio, ver Footer.tsx) y `brandText` al hover -- transición
   corta, solo `color` (spec: "sin efectos colaterales"). Sin subrayado:
   GlobalStyles ya pone `text-decoration: none` en todos los `a`. */
const ScNavLink = styled.a`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 500;
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

const NAV_SECTION_LINKS = [
  { key: "story", href: "#story" },
  { key: "journey", href: "#journey" },
  { key: "features", href: "#features" },
  { key: "contact", href: "#contact" },
] as const;

export function Navbar(): ReactElement {
  const scrolled = useScrolled(8);
  const { phase } = useStage();
  const { themeName } = useTheme();
  const { t } = useTranslation("common");
  // "pending" mientras la fase de página siga en "backdrop" (spec §7.4): el
  // navbar entra en "chrome", a la vez que la copia del hero, no antes.
  const introState = phase === "backdrop" ? "pending" : "in";

  /*
   * ACCESIBILIDAD durante el intro: `data-intro="pending"` SOLO anima
   * `opacity`/`transform`. Nunca `display:none`, `visibility:hidden` ni
   * `aria-hidden` -- con opacity 0 el elemento sigue en el árbol de
   * accesibilidad, sigue en el orden de tabulación y un `Tab` durante el
   * tramo de carga sigue moviendo el foco a sus controles con normalidad
   * (verificado leyendo la especificación de accesibilidad de CSS opacity:
   * a diferencia de `visibility`/`display`, `opacity` no altera ni el árbol
   * de accesibilidad ni la secuencia de tabulación). El tramo es breve
   * (como mucho STAGE_FALLBACK_MS, ~1.5s, y normalmente HERO_CHROME_OFFSET_MS,
   * ~0.76s) y bajo `prefers-reduced-motion: reduce` no llega a producirse
   * -- el CSS de ScHeader fuerza visible de inmediato en ese caso -- así que
   * no hace falta ningún tratamiento adicional de foco.
   */

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
    <ScHeader
      data-scrolled={scrolled}
      data-intro={introState}
    >
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
        {themeName === "light" && (
          <ScNavLinks>
            {NAV_SECTION_LINKS.map(({ key, href }) => (
              <ScNavLink
                key={key}
                href={href}
              >
                {t(`Common.Navigation.${key}`)}
              </ScNavLink>
            ))}
          </ScNavLinks>
        )}
        <ScActions>
          <LanguageSelector />
          <ThemeToggle />
        </ScActions>
      </ScNav>
    </ScHeader>
  );
}
