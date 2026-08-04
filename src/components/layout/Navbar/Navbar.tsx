"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { NAV_DETACH_ANIM_MS, useNavDetach } from "@/hooks/useNavDetach";
import { useStage } from "@/motion/StageProvider";

// El glass es el único uso sancionado de glassmorphism del sistema (§13.2 de
// la spec): reservado a capas que flotan sobre contenido en scroll (nav
// on-scroll, modal, sheet, toast), nunca en superficies estáticas. Por eso
// arranca transparente sobre el hero y solo pasa a cristal esmerilado cuando
// `data-scrolled` es true — el contraste con el estado transparente es lo
// que justifica el efecto. Desde la tarea de despegue al hacer scroll (spec
// `docs/superpowers/specs/2026-07-31-navbar-scroll-detach-design.md`, D1/D9)
// el cristal YA NO vive en `ScHeader`: se muda a `ScSurface`, una capa
// hermana de `ScNav` sin contenido propio (ver su comentario, más abajo),
// para poder deformarla con squash & stretch sin deformar el texto ni los
// iconos de la marca y las acciones.
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
 * CONVIVENCIA con la `transition` que ScHeader declara: desde la tarea de
 * despegue al hacer scroll (spec 2026-07-31, D1) el cristal ya no vive aquí
 * -- se mudó a `ScSurface`, ver más abajo --, así que la lista ya NO lleva
 * las entradas de background-color/border-color/backdrop-filter que tenía
 * antes; en su lugar se le AÑADE una entrada de `padding-inline` (el hueco
 * lateral de la píldora al despegarse, ver el comentario de `ScBar`).
 * `opacity`/`transform` (el intro) y `padding-inline` (el despegue) conviven
 * como TRES entradas de la misma propiedad `transition` (longhand con lista
 * separada por comas): el bloque `&[data-scrolled="true"]` de más abajo
 * SOLO cambia el VALOR de `padding-inline`, nunca redeclara la lista
 * completa -- redeclararla ahí borraría las entradas del intro (regla dura
 * de esta tarea, y lección §5.1 de CLAUDE.md global en espejo, aplicada
 * aquí a `transition` en vez de a un selector CSS). `transition` acepta una
 * lista de <duración, timing-function> por propiedad; no es el caso de la
 * lección de `task/lessons.md` sobre `background: valor` en :hover (esa es
 * una propiedad ABREVIADA que resetea sub-propiedades no mencionadas) --
 * aquí no hay abreviatura ni reseteo, cada propiedad listada anima con SU
 * PROPIA duración/easing sin pisar a las demás.
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
  opacity: 1;
  transform: translateY(0);
  /* Hueco lateral de la píldora al despegarse (spec §4): longitud pura,
     0 <-> var(--nav-gap). Nunca width: 100% -> calc(100% - 2*gap) -- ver el
     comentario de ScBar sobre por qué el ancho anima con max-width en vez
     de con width. */
  padding-inline: 0;
  transition:
    padding-inline ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    opacity ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate},
    transform ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.decelerate};

  &[data-scrolled="true"] {
    padding-inline: var(--nav-gap);
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

/*
 * ScBar es la CAPA DE GEOMETRÍA (spec D1/D2): ancho, centrado y separación
 * vertical de la píldora. Nunca lleva chrome visual -- eso vive en
 * ScSurface, su hermana -- así que cambiar de tamaño no repinta cristal,
 * borde ni sombra: solo mueve el límite dentro del que se centra ScNav.
 *
 * `max-width: 100vw -> navMax` en vez de `width: 100% -> calc(100% -
 * 2*gap)` (spec §4): la segunda forma obliga al motor a interpolar entre un
 * PORCENTAJE y un `calc()` MIXTO (porcentaje + longitud absoluta) -- la
 * especificación de CSS lo permite, pero si algún motor no lo resolviera el
 * ancho SALTARÍA en vez de animarse, justo el fallo que esta coreografía
 * existe para evitar. La forma elegida lo evita por completo: `ScBar` tiene
 * `width: auto` (rellena lo que le deje `ScHeader`), su `max-width` va de
 * `100vw` (no limita nada: ya es >= el ancho disponible) a `1280px` -- dos
 * LONGITUDES ABSOLUTAS, la interpolación más simple que existe -- y el
 * hueco lateral lo aporta `ScHeader` con `padding-inline` (otra longitud
 * pura, 0 <-> var(--nav-gap)), nunca esta capa. `margin-inline: auto`
 * centra en cuanto el tope de `max-width` entra en juego.
 *
 * La lista de `transition` es exclusiva de esta capa (a diferencia de la de
 * ScHeader, que NUNCA se redeclara -- ver su comentario) y por eso SÍ se
 * redeclara entera en el bloque de estado: aquí no hay ninguna entrada de
 * otra coreografía (intro, etc.) que perder.
 */
const ScBar = styled.div`
  position: relative;
  width: auto;
  margin-inline: auto;
  margin-top: 0;
  max-width: 100vw;
  transition:
    max-width ${({ theme }) => theme.data.motion.duration.slow}
      ${({ theme }) => theme.data.motion.easing.emphasized}
      ${({ theme }) => theme.data.motion.duration.fast},
    margin-top ${({ theme }) => theme.data.motion.duration.fast}
      ${({ theme }) => theme.data.motion.easing.accelerate}
      ${({ theme }) => theme.data.motion.duration.instant};

  [data-scrolled="true"] & {
    max-width: ${({ theme }) => theme.data.grid.navMax};
    margin-top: var(--nav-gap);
    transition:
      max-width ${({ theme }) => theme.data.motion.duration.slow}
        ${({ theme }) => theme.data.motion.easing.overshoot}
        ${({ theme }) => theme.data.motion.duration.instant},
      margin-top ${({ theme }) => theme.data.motion.duration.base}
        ${({ theme }) => theme.data.motion.easing.emphasized}
        ${({ theme }) => theme.data.motion.duration.fast};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    /* Hallazgo 4 (auditoría): el estado anidado [data-scrolled="true"] &
       (arriba) tiene MAYOR especificidad (selector de atributo + clase) que
       el & suelto de justo encima (solo clase) -- sin redeclararlo aquí
       dentro, bajo reduce ganaría la transition CON easings reales de ese
       bloque en vez de "none", exactamente el mismo patrón que ScHeader ya
       resuelve redeclarando &[data-intro="pending"] dentro de su propio
       bloque reduce (ver más arriba). */
    [data-scrolled="true"] & {
      transition: none;
    }
  }
`;

/*
 * peelOff / stickOn: squash & stretch clásico (spec D3, §5) -- estira en Y
 * y pellizca en X en contrafase (conservación de volumen), disparado SOLO
 * en el cruce real de umbral (`data-detach`, nunca `data-scrolled`, ver
 * `useNavDetach`) para que la carga de una página ya scrolleada no dispare
 * el slime. `peelOff` sobrepasa el destino hacia abajo (estira más allá de
 * 1 antes de asentar): lee como material que cede al despegarse. `stickOn`
 * sobrepasa hacia el aplastamiento antes de asentar: lee como el impacto
 * del material al pegarse de vuelta contra el borde.
 */
const peelOff = keyframes`
  0% {
    transform: scaleY(1) scaleX(1);
  }
  30% {
    transform: scaleY(1.06) scaleX(0.996);
  }
  62% {
    transform: scaleY(0.98) scaleX(1.003);
  }
  100% {
    transform: scaleY(1) scaleX(1);
  }
`;

const stickOn = keyframes`
  0% {
    transform: scaleY(1) scaleX(1);
  }
  28% {
    transform: scaleY(0.93) scaleX(1.004);
  }
  60% {
    transform: scaleY(1.03) scaleX(0.998);
  }
  100% {
    transform: scaleY(1) scaleX(1);
  }
`;

/*
 * ScSurface es la CAPA DE CHROME (spec D1): cristal, borde, radio y sombra,
 * más las `@keyframes` de squash & stretch. Hermana de `ScNav`, no su
 * contenedora: es un `<div>` puramente decorativo (`aria-hidden`, sin
 * contenido, `position: absolute; inset: 0`, pintando DETRÁS de `ScNav`,
 * que por eso gana `position: relative`) -- así se puede deformar la
 * superficie sin deformar el texto ni los iconos de la marca y las
 * acciones, que es justo lo que D1 pide.
 *
 * El cristal deja de conmutarse por background-color/border-color/
 * backdrop-filter (tres transiciones de PINTADO) y pasa a ser SIEMPRE el
 * mismo, conmutado por una única `opacity` compuesta en GPU (D9): con
 * opacity 0 la capa no pinta cristal ni proyecta `backdrop-filter`, así que
 * el estado transparente sobre el hero queda idéntico al actual.
 */
const ScSurface = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  transform-origin: top center;
  background: ${({ theme }) => theme.data.glass.bg};
  /* -webkit- primero: Safari (incl. iOS) solo reconoce el prefijo; el
     backdrop-filter sin prefijo lo sobrescribe donde ambos existen. Si el
     navegador no soporta ninguno de los dos, la capa sigue siendo legible
     porque glass.bg ya es semitransparente por sí solo -- no hay fallback
     de texto ilegible. */
  -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  border: ${({ theme }) => theme.data.glass.border};
  box-shadow: ${({ theme }) => theme.data.elevation[2]};
  border-radius: 0;
  opacity: 0;
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    border-radius ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  [data-scrolled="true"] & {
    opacity: 1;
    border-radius: ${({ theme }) => theme.data.radius.xl};
  }

  @media (prefers-reduced-motion: no-preference) {
    [data-detach="detaching"] & {
      animation: ${peelOff} ${NAV_DETACH_ANIM_MS}ms
        ${({ theme }) => theme.data.motion.easing.standard} both;
    }

    [data-detach="attaching"] & {
      animation: ${stickOn} ${NAV_DETACH_ANIM_MS}ms
        ${({ theme }) => theme.data.motion.easing.standard} both;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const ScNav = styled.nav`
  position: relative;
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
  const { scrolled, phase: detachPhase } = useNavDetach(8);
  const { phase } = useStage();
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
      data-detach={detachPhase}
      data-intro={introState}
    >
      <ScBar>
        <ScSurface
          aria-hidden="true"
          data-nav-surface
        />
        <ScNav>
          <ScBrandLink href="/">
            {/* Aqui vivia `EyeCornerMark`, un punto decorativo que se
                encendia con `data-scrolled`. Retirado el 2026-07-31 a
                peticion del usuario: al cruzar el umbral, el unico cambio
                visual de la barra es su propio despegue: nada se enciende
                al lado de la marca. El componente se elimino entero (este
                era su unico consumidor en todo el repo), no se dejo
                importado sin usar. */}
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
          <ScActions>
            <LanguageSelector />
            <ThemeToggle />
          </ScActions>
        </ScNav>
      </ScBar>
    </ScHeader>
  );
}
