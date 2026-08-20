"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { BrandName } from "@/components/layout/Brand/BrandName";
import { LanguageSelector } from "@/components/layout/LanguageSelector/LanguageSelector";
import { ThemeToggle } from "@/components/layout/ThemeToggle/ThemeToggle";
import { Logo } from "@/components/ui/Logo/Logo";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import {
  navGroupsFor,
  navLocale,
  type NavGroup,
  type NavGroupKey,
  type NavItem,
} from "@/config/navigation";
import { routePath } from "@/config/site";
import { useActiveSectionKey } from "@/hooks/useActiveSection";
import { NAV_DETACH_ANIM_MS, useNavDetach } from "@/hooks/useNavDetach";
import { HERO_CHROME_OFFSET_MS } from "@/motion/timings";
import { OVERLAY, PRESS } from "@/motion/vocabulary";
import {
  NavSheet,
  NavSheetTrigger,
  navActiveAccent,
  useNavSheet,
} from "./NavSheet";
import { focusNavAnchorTarget } from "./navAnchorFocus";

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
 * Entrada del navbar en la carga (tarea C4, spec §7.4; motor re-expresado en
 * CSS estático el 2026-08-11, Task 10 del plan premium): `opacity` +
 * `translateY(-8px) -> 0`, con `motion.duration.slow`/`easing.decelerate` --
 * la escala de movimiento de la casa, no una constante propia de la
 * coreografía del hero, porque esto ES una transición de interfaz normal
 * (aparición de la barra), no parte de la coreografía en sí (mismo criterio
 * que documenta HERO_CHROME_OFFSET_MS en hero.transition.ts).
 *
 * QUÉ CAMBIÓ EN 2026-08-11 y qué no. Hasta esa fecha esto era una
 * `transition` disparada por el atributo `data-intro`, que escribía la
 * máquina de fases de la página (`useStage()`) cuando el fondo del hero
 * avisaba de que ya se estaba revelando: sin JavaScript —o antes de que el
 * bundle hidratara— la barra se quedaba en `opacity: 0`. Ahora es una
 * `@keyframes` declarada sin ninguna condición, presente en el CSS del HTML
 * exportado, con `animation-delay: HERO_CHROME_OFFSET_MS`: el retardo de
 * 760 ms se conserva **verbatim** (a diferencia de la copia del hero, que lo
 * pierde por su papel en el LCP —ver el docblock de `ScCopy` en `Hero.tsx`—),
 * porque el navbar no es candidato LCP en ninguna de las mediciones y aquí el
 * número se paga sin coste: «al final el navbar» (spec §1) sigue cumpliéndose
 * al pie de la letra, y ahora también con JavaScript deshabilitado.
 *
 * CONVIVENCIA con la `transition` que ScHeader declara: desde la tarea de
 * despegue al hacer scroll (spec 2026-07-31, D1) el cristal ya no vive aquí
 * -- se mudó a `ScSurface`, ver más abajo --, así que la lista ya NO lleva
 * las entradas de background-color/border-color/backdrop-filter que tenía
 * antes; en su lugar lleva `padding-inline` (el hueco lateral de la píldora
 * al despegarse, ver el comentario de `ScBar`). Desde 2026-08-11
 * `opacity`/`transform` SALEN de esa lista y no pueden volver: una
 * `@keyframes` sobre una propiedad IMPIDE que la `transition` de esa misma
 * propiedad llegue siquiera a crearse (medido, `task/lessons.md` 2026-07-26)
 * -- dejarlas ahí habría sido código muerto sin ningún error que lo delatara.
 * El bloque `&[data-scrolled="true"]` de más abajo SOLO cambia el VALOR de
 * `padding-inline` y nunca redeclara la lista completa, que es lo que hoy
 * mantiene esa única entrada a salvo.
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
const navbarDrop = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ScHeader = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: ${({ theme }) => theme.data.zIndex.stickyNav};
  opacity: 1;
  /* Safe area (Task 13, punto 1 del brief): esta barra está anclada a
     top: 0 del VIEWPORT, no de un contenedor con margen propio -- con
     viewport-fit=cover (app/layout.tsx) el documento se extiende bajo el
     notch/dynamic island, así que sin este relleno la barra podría nacer
     parcialmente tapada en un dispositivo con recorte físico arriba.
     ADITIVO por construcción: no había padding-top declarado antes (el
     alto real lo fija --nav-height en ScNav, más abajo), así que con
     insets a 0 (escritorio, la inmensa mayoría de Android) el fallback de
     env() deja este valor en 0px -- layout idéntico al de antes de esta
     tarea. Con inset > 0 el alto total de la barra crece exactamente lo que
     el hardware recorta, empujando el contenido hacia abajo -- el
     comportamiento correcto para una barra fija a ese borde. */
  padding-top: env(safe-area-inset-top, 0px);
  /* translateY(0) NO es decorativo y no se puede retirar aunque la animación
     ya escriba transform: position fixed + z-index distinto de auto ya
     aislaban esta barra, pero además hay código que depende explícitamente
     de que ScHeader declare transform -- NavSheet vive FUERA de este
     elemento justo porque un ancestro con transform pasa a ser el bloque
     contenedor de los position fixed de su interior (ver el comentario del
     JSX, más abajo). Con fill backwards, durante el retardo el valor
     efectivo es el del keyframe from, que también es un transform: la
     propiedad nunca computa none. */
  transform: translateY(0);
  /* Intro de carga, SIN condición de JS: la regla viaja en el CSS del HTML
     exportado, así que su reloj arranca con el primer pintado y la barra
     entra igual con JavaScript deshabilitado. backwards, no both: el estado
     final coincide con los valores de reposo declarados justo arriba, así
     que solo hace falta rellenar hacia atrás el tramo del retardo -- y sin
     forwards la animación deja de gobernar la propiedad al terminar, que es
     lo que permite que el resto de la barra siga siendo CSS normal.

     LONGHANDS, no la abreviatura animation: es la misma decisión que ya
     tomó eyeStagger (eye.parts.tsx) y por el mismo motivo medido -- jsdom no
     expande la abreviatura, así que un candado sobre animationDelay leería
     cadena vacía y el retardo de esta coreografía quedaría sin ninguna
     prueba (regla 38 de RULES.md). Verificado en esta misma tarea: con la
     abreviatura, el test daba '' en vez de 760ms. */
  animation-name: ${navbarDrop};
  animation-duration: ${({ theme }) => theme.data.motion.duration.slow};
  animation-timing-function: ${({ theme }) =>
    theme.data.motion.easing.decelerate};
  animation-delay: ${HERO_CHROME_OFFSET_MS}ms;
  animation-fill-mode: backwards;
  /* Hueco lateral de la píldora al despegarse (spec §4): longitud pura,
     0 <-> var(--nav-gap). Nunca width: 100% -> calc(100% - 2*gap) -- ver el
     comentario de ScBar sobre por qué el ancho anima con max-width en vez
     de con width. */
  padding-inline: 0;
  transition: padding-inline ${({ theme }) => theme.data.motion.duration.base}
    ${({ theme }) => theme.data.motion.easing.standard};

  &[data-scrolled="true"] {
    padding-inline: var(--nav-gap);
  }

  /*
   * ACCESIBILIDAD durante el retardo del intro: SOLO opacity/transform
   * (regla de movimiento de la casa). Nunca display:none, visibility:hidden
   * ni aria-hidden -- el navbar tiene que seguir en el orden de tabulación y
   * anunciado durante ese tramo (ver el comentario de accesibilidad en
   * Navbar(), más abajo). Un elemento con opacity 0 sigue siendo focalizable
   * y anunciado; solo deja de leerse su contraste visual, y ahora el tramo
   * es un retardo FIJO de HERO_CHROME_OFFSET_MS (~0,76 s) en vez de una
   * espera abierta a que el bundle hidratara.
   */

  @media (prefers-reduced-motion: reduce) {
    /* Visible de inmediato, sin animación (spec §7.4). El guard sigue siendo
       obligatorio: GlobalStyles colapsa animation-duration a 0.001ms pero NO
       toca animation-delay, así que sin este bloque la barra seguiría
       invisible los 760 ms del retardo (fill backwards) y luego aparecería
       de golpe -- peor que no animar. Ya no hace falta repetir el estado
       para ningún valor de data-intro: ese atributo desapareció de este
       componente, así que este único bloque cierra el caso entero, sin
       ninguna ventana de carrera contra un efecto de React. */
    animation: none;
    transition: none;
    opacity: 1;
    transform: translateY(0);
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
       bloque en vez de "none". El mismo patrón lo resuelve ScNavPanel (más
       abajo) redeclarando su &[data-open="true"] dentro de su propio bloque
       reduce; ScHeader era el otro ejemplo hasta 2026-08-11, cuando su
       intro dejó de tener estado anidado que redeclarar. */
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

/*
 * `padding` horizontal (Task 13, punto 1 del brief): `calc(token +
 * env(safe-area-inset-*, 0px))`, no la mera longitud del token. Este es el
 * nivel que aloja el contenido REAL de la barra (marca, enlaces, idioma,
 * tema) -- a diferencia de `ScHeader`/`ScBar`/`ScSurface`, que siguen
 * pintando cristal/borde edge-to-edge sin recorte, el contenido interactivo
 * sí tiene que apartarse del notch en landscape (izquierda/derecha, donde
 * cae el recorte físico al rotar). Left/right por separado porque un notch
 * lateral en landscape solo recorta UN borde a la vez -- una única cifra de
 * `padding-inline` no podría representar esa asimetría. Con insets a 0
 * (escritorio, la inmensa mayoría de Android) los dos `calc()` colapsan al
 * valor del token de siempre: layout idéntico al de antes de esta tarea.
 */
const ScNav = styled.nav`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[4]};
  /* La misma variable que descuenta el Hero (ver GlobalStyles): si la banda
     cambia de alto, las dos medidas cambian juntas. */
  height: var(--nav-height);
  padding: 0
    calc(
      ${({ theme }) => theme.data.space[4]} + env(safe-area-inset-right, 0px)
    )
    0
    calc(${({ theme }) => theme.data.space[4]} + env(safe-area-inset-left, 0px));

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 0
      calc(
        ${({ theme }) => theme.data.space[6]} + env(safe-area-inset-right, 0px)
      )
      0
      calc(
        ${({ theme }) => theme.data.space[6]} + env(safe-area-inset-left, 0px)
      );
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
 *
 * `min-height: 44px` (auditoria premium 2026-08-08): en movil la marca es el
 * UNICO enlace de navegacion visible -- `ScNavLinks` solo pasa a flex desde
 * `md` (ver mas abajo) --, y medía 26px de alto (line-height del logo/nombre
 * sin ningun suelo propio), por debajo del área táctil mínima AA de 44px.
 * Mismo precedente literal que `ScNavTrigger` (más abajo) y
 * `ScLanguageButton` (`LanguageSelector.tsx`). `inline-flex` +
 * `align-items: center` ya centran el contenido: min-height solo agranda la
 * caja de clic, no cambia el aspecto visual del logo ni del nombre.
 */
/*
 * `min-width: 0` + recorte del rotulo: la marca CEDE espacio antes que los
 * controles (critica externa #13, verificacion de la ola I).
 *
 * El defecto que cierra, medido en navegador a 390x844 con la raiz del
 * documento en 32px (el 200 % de la preferencia del usuario, que este sitio
 * hereda porque no declara `font-size` en `html`): la fila del navbar es un
 * flex con `space-between`, y sus items no encogen por debajo de su
 * contenido -- `min-width: auto` es el valor inicial de un item flex. Con
 * todo escalando en `rem` a la vez (gap, padding lateral y el 1.15rem de
 * esta marca), la fila medía mas que el viewport y el grupo de la derecha
 * salia fuera: la hamburguesa quedaba en `left: 434` sobre 390px de ancho,
 * ENTERAMENTE fuera de pantalla y no alcanzable (`document.elementFromPoint`
 * sobre su centro devolvia null). A 200 % de fuente no habia forma de abrir
 * el menu de navegacion.
 *
 * Por que ceder aqui y no en los controles: la marca es texto y degrada
 * legiblemente con puntos suspensivos; la hamburguesa, el conmutador de tema
 * y el selector de idioma son dianas de 44px que WCAG 2.5.8 no deja encoger
 * y que ademas son la unica via de navegacion en movil. Entre recortar un
 * rotulo y perder el menu, se recorta el rotulo.
 *
 * El logotipo (`flex: none` en su propio bloque) no se recorta: lo que cede
 * es el texto de al lado.
 */
const ScBrandLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  min-height: 44px;
  font-size: 1.15rem;
  color: ${({ theme }) => theme.data.semantic.text};
  min-width: 0;
  overflow: hidden;

  > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

/* `flex: none`: el grupo de controles NUNCA cede espacio (ver el docblock de
   `ScBrandLink`). Son dianas de 44px y la unica navegacion en movil. */
const ScActions = styled.div`
  display: flex;
  align-items: center;
  flex: none;
  gap: ${({ theme }) => theme.data.space[3]};
`;

/*
 * Hueco del selector de idioma EN LA BARRA. Existe desde la hoja de
 * navegación móvil (Task 10): bajo `md` el idioma no cabe en la barra --
 * medido en la spec del vault, 337 px de contenido intrínseco en 343 px
 * disponibles a 375 px, sin espacio para el disparador de 44x44 -- y se muda
 * dentro de la hoja, que renderiza su propia copia de `LanguageSelector`
 * (ver el docblock de `NavSheet.tsx`, que explica por qué son dos copias con
 * visibilidad excluyente por CSS y no un movimiento por JavaScript).
 *
 * Mobile-first, como el resto de la spec: la regla base es la MÓVIL
 * (`display: none`, el idioma vive en la hoja) y se corrige hacia arriba con
 * `min-width`. Desde `md` vuelve a la barra y el conjunto queda EXACTAMENTE
 * como estaba antes de esta tarea: un contenedor flexible cuyo tamaño
 * intrínseco es el de su contenido, así que ni el hueco de `ScActions` ni la
 * posición de nada cambian un píxel en escritorio.
 */
const ScBarLanguage = styled.div`
  display: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: inline-flex;
    align-items: center;
  }
`;

/*
 * Grupos de navegación desplegables (tarea W4), reemplazo de los cuatro
 * enlaces planos que este bloque pintaba hasta entonces
 * (`NAV_SECTION_LINKS`). Tres al nacer (onSite/discover/resources); cuatro
 * desde la tarea 6 (auditoría premium), que añade "community" a
 * `NAV_GROUPS` -- este bloque no necesitó ningún cambio propio para ganarlo,
 * ya recorre el array entero (`navGroups.map`, más abajo, el mismo modelo
 * resuelto para el idioma de la página). SOLO ≥ md
 * (mockup: barra angosta en breakpoints menores). Bajo `md` la navegación NO
 * desaparece desde Task 10: los MISMOS `NAV_GROUPS` se entregan en la hoja
 * de navegación móvil (`NavSheet.tsx`), que es la otra cara de este bloque
 * -- una sola fuente de verdad de destinos, dos presentaciones excluyentes
 * por CSS. `<div>`, no un segundo `<nav>`: `ScNav` ya es el elemento `nav`
 * de la barra: anidar un landmark de navegación dentro de otro sería un
 * `nav` redundante para lectores de pantalla.
 *
 * Oculto por `display: none` bajo `md` (no desmontado): igual que el resto
 * del navbar, no cambia el orden de tabulación de forma condicional al
 * viewport.
 *
 * ## SIN JAVASCRIPT: OCULTO (crítica externa #11, hallazgo A, P1)
 *
 * El hallazgo, medido con `javaScriptEnabled: false` real: los cuatro
 * disparadores («En el sitio», «Descubre», «Recursos», «Comunidad») se seguían
 * pintando con su galón, y al pulsarlos `aria-expanded` no se movía de
 * `"false"`, no se abría nada y nada lo explicaba. La incoherencia la creó la
 * ola anterior (commit `acbbcf4`): ocultó bajo `scripting: none` el conmutador
 * de tema, el selector de idioma y el disparador de la hoja móvil, y estos
 * cuatro se quedaron fuera de la regla -- así que el evaluador ya no lo midió
 * como una limitación del sitio sino como una incoherencia interna.
 *
 * La apertura es estado de React (`openGroup`, más abajo, y de ahí el
 * `data-open`/`inert` de `ScNavPanel`): sin JavaScript ese estado no cambia
 * nunca, el panel se queda para siempre en `visibility: hidden` + `inert` (los
 * dos ya horneados en el HTML exportado, que se genera con `isOpen === false`)
 * y el disparador es una promesa que no se puede cumplir. Mismo criterio,
 * mismo mecanismo y mismo precedente que `ScSheetTriggerSlot`
 * (`NavSheet.tsx`), `ScThemeToggleSlot` (`ThemeToggle.tsx`) y
 * `ScLanguageSelector` (`LanguageSelector.tsx`).
 *
 * NO DEJA A NADIE SIN SALIDA, que es lo que decide el caso: `Footer.tsx`
 * recorre el MISMO `NAV_GROUPS` y pinta cada destino como un `<a href>` plano,
 * siempre presente en el HTML exportado y sin ninguna capa que abrir. La
 * navegación completa sigue disponible sin JavaScript; lo que desaparece es el
 * atajo que no funciona.
 *
 * EL GUARD VA SOBRE EL CONTENEDOR, no sobre cada `ScNavGroup`, y es una
 * decisión: `ScNavLinks` no tiene hoy ningún hijo que no sea un grupo
 * desplegable (`navGroups.map`, sin excepciones), así que ocultar los cuatro
 * grupos y ocultar su contenedor describen exactamente el mismo conjunto --
 * pero un contenedor oculto no genera CAJA, mientras que cuatro grupos ocultos
 * dentro de un flex vivo dejan un ítem de anchura cero en `ScNav`. Si algún
 * día este bloque gana un enlace PLANO (que sin JavaScript sí funcionaría), el
 * guard baja a `ScNavGroup` y este comentario deja de ser cierto.
 *
 * EL HUECO NO ROMPE LA MAQUETA, verificado en fuente y no por suposición:
 * `ScNav` es `display: flex; justify-content: space-between` (ver su bloque,
 * más arriba) con tres hijos -- marca, este bloque y `ScActions`. Un hijo con
 * `display: none` no es ítem de flex, así que ni ocupa ni aporta `gap`: quedan
 * marca a la izquierda y acciones a la derecha, que es EXACTAMENTE la maqueta
 * que el sitio ya sirve hoy bajo 768px, donde la regla base de este mismo
 * bloque ya es `display: none`. No es una maqueta nueva sin probar: es la
 * móvil, en escritorio.
 *
 * El guard va DESPUÉS del bloque de `md` a propósito: los dos son
 * `@media` con la misma especificidad, así que el orden de origen es lo único
 * que decide cuál gana cuando ambos casan (≥768px sin JavaScript) -- mismo
 * orden y mismo motivo que `ScSheetTriggerSlot`. CON JavaScript no cambia
 * nada: ni el `display` de ninguna de las dos ramas, ni el foco, ni el orden
 * de tabulación.
 */
const ScNavLinks = styled.div`
  display: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[5]};
  }

  /* Sin JavaScript ningún grupo abre y el pie ya expone la navegación
     completa: ver el docblock de arriba. */
  @media (scripting: none) {
    display: none;
  }
`;

/* Texto pequeño, `textMuted` en reposo (mismo rol que el resto de enlaces
   secundarios del sitio, ver Footer.tsx) y `brandText` al hover -- transición
   corta, solo `color` (spec: "sin efectos colaterales"). Sin subrayado:
   GlobalStyles ya pone `text-decoration: none` en todos los `a`.

   transform se añade a esta lista (Task 9, vocabulary.PRESS): el hover de
   arriba solo cambia color -- sin movimiento que guardar tras
   PRESS.hoverGuard (punto 2 del brief) --, así que la entrada nace ya con
   los valores de PRESS, gobernando exclusivamente el press de abajo.
   ScNavPanelLink (más abajo, styled(ScNavLink)) hereda este :active por
   composición, sin declarar nada propio. */
const ScNavLink = styled.a`
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 500;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /* Task 13, punto 2 del brief: elimina el retardo de doble-tap.
     ScNavPanelLink (más abajo, styled(ScNavLink)) lo hereda por
     composición, sin declarar nada propio -- mismo criterio que ya
     documenta el :active de este mismo componente. */
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

/*
 * Un grupo del menú desplegable: envoltorio con `position: relative` que
 * ancla su panel (`ScNavPanel`, `position: absolute; top: 100%`) al
 * disparador que lo abre. Es además el nodo donde `NavGroupMenu` escucha
 * `onKeyDown` (Escape, regla 3) y `onBlur` (foco que sale del grupo, regla
 * 5): React hace burbujear los dos eventos desde cualquier descendiente
 * -- el propio disparador o un enlace del panel --, así que se capturan
 * una sola vez aquí, nunca por separado en cada uno de los dos.
 */
const ScNavGroup = styled.div`
  position: relative;
`;

/*
 * Disparador de un grupo: mismo lenguaje visual que `ScNavLink`
 * (`textMuted` en reposo, `brandText` en hover/focus, transición corta
 * solo de `color`) -- reutiliza ese bloque de reglas en vez de duplicarlo,
 * sobre un `<button>` con su apariencia nativa reseteada. Área táctil
 * mínima AA de 44px, mismo precedente literal que `ScLanguageButton`
 * (`LanguageSelector.tsx`).
 */
/* transform se añade a esta lista (Task 9, vocabulary.PRESS), mismo
   criterio que ScNavLink arriba: el hover solo cambia color, sin nada que
   guardar tras PRESS.hoverGuard. */
/*
 * `$current` -- SEÑAL VISIBLE DE SECCIÓN ACTUAL CON LOS PANELES PLEGADOS
 * (2026-08-20, ola post-crítica #13).
 *
 * EL DEFECTO: el scrollspy funciona y marca `aria-current="location"`
 * correctamente, pero con la barra plegada los cuatro disparadores se pintan
 * idénticos (mismo `textMuted`, ningún pseudo-elemento con `content`), así que
 * la señal solo se percibe abriendo un panel o con tecnología de apoyo. Un
 * usuario vidente no tiene ninguna.
 *
 * TRATAMIENTO REVERSIBLE EN UNA LÍNEA (borrar esta declaración y la prop
 * `$current` de `NavGroupMenu`): el tratamiento visual definitivo es DECISIÓN
 * DEL DUEÑO desde la crítica #9 («señal de sección activa visible con paneles
 * cerrados») y esta entrega no la toma. Lo único que se hace aquí es reutilizar
 * VERBATIM el tratamiento que este mismo sitio ya usa para "de este conjunto,
 * éste es el actual": `text-decoration: underline` + `text-underline-offset:
 * 0.2em`, exactamente lo que `ScLanguageButton` `$active`
 * (`LanguageSelector.tsx`) pinta para el idioma activo -- y que vive en ESTA
 * MISMA barra, a unos píxeles de aquí.
 *
 * POR QUÉ EL SUBRAYADO Y NO EL PUNTO DEL PANEL (`ScNavPanelLink::before`), que
 * sería la otra reutilización literal: el punto mide `space[2]` (8px) más el
 * `gap` de la fila y ocupa sitio en el flujo. En el panel eso no cuesta nada
 * (columna vertical, ancho libre), pero en la barra los cuatro disparadores
 * comparten una fila con la marca, el idioma y el conmutador de tema: darles a
 * los cuatro el hueco reservado ensancharía la barra ~12px por disparador
 * (~48px en total) y pintarlo solo en el activo movería los otros tres al
 * entrar el lector en las secciones. Ninguna de las dos consecuencias se puede
 * medir en jsdom (no hace layout), y el ancho de la barra a 768px es justo
 * donde este sitio ya va apretado. El subrayado no participa del layout: no
 * reflowea nada y no puede empujar nada.
 *
 * NO CAMBIA NADA DE ARIA, a propósito: el disparador es un `<button>` que abre
 * un panel, no un destino, así que `aria-current` sigue viviendo donde
 * corresponde -- en el enlace del panel que SÍ representa la ubicación. Esta
 * marca es un refuerzo visual redundante para quien no abre el panel, no una
 * segunda fuente de verdad: se calcula del MISMO `activeSectionKey`.
 *
 * SOLO PUEDE ENCENDERSE EL GRUPO `onSite`, y conviene saberlo antes de leer el
 * JSX: es el único con items `kind: "section"` (los de «Descubre» apuntan
 * dentro de Features y no son destinos de scrollspy, ver `navigation.ts`). La
 * marca responde por tanto "la sección que estás leyendo está en este grupo",
 * no "cuál es"; esa segunda mitad sigue siendo el punto del panel al abrirlo.
 */
const ScNavTrigger = styled.button<{ $current: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[1]};
  min-height: 44px;
  padding: 0;
  background: none;
  border: none;
  font-family: inherit;
  font-size: ${({ theme }) => theme.data.type.scale.bodySm.size};
  font-weight: 500;
  color: ${({ theme }) => theme.data.semantic.textMuted};
  /* Ver el docblock de arriba: mismo par de declaraciones que ScLanguageButton
     $active usa para el idioma actual, ni una más. (Sin comillas invertidas
     dentro del template: regla 23 de RULES.md, ya ha roto el build tres
     veces.) */
  text-decoration: ${({ $current }) => ($current ? "underline" : "none")};
  text-underline-offset: 0.2em;
  cursor: pointer;
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

/*
 * Indicador de apertura: SOLO `transform: rotate()` como animación, ninguna
 * otra propiedad -- guard de `reduce` igual que el resto de transiciones
 * nuevas de este fichero. `currentColor` hereda el color que ya resuelve
 * `ScNavTrigger` (`textMuted`/`brandText`), así que no hace falta ningún
 * token de color propio en el trazo.
 *
 * `width`/`height`/`flex` son OBLIGATORIOS, no cosméticos, y esta es la
 * TERCERA vez que este repo tropieza con lo mismo (ver el docblock de
 * `ScLogo` en `src/components/ui/Logo/Logo.tsx`, que documenta el mismo
 * fallo medido): `GlobalStyles` declara `svg { width: 100%; display: block; }`
 * para todo el sitio, y una declaración CSS gana SIEMPRE a la geometría
 * implícita del `viewBox`. Sin estas tres líneas, el chevron se estira al
 * 100% de su contenedor flexible y arrastra su altura por relación de
 * aspecto: MEDIDO en el navegador real sobre esta misma barra, **215x143 px**,
 * lo que hinchaba el disparador a 143 px de alto dentro de una banda de
 * 56 px (`--nav-height`) y descolgaba la fila entera de la navegación.
 * Ningún test de jsdom lo habría visto -- jsdom no hace layout, así que
 * `getBoundingClientRect()` devuelve ceros y la regresión es invisible para
 * la suite; el candado que sí la ata (`Navbar.test.tsx`) comprueba las
 * DECLARACIONES de width/height, que es lo que jsdom sí resuelve.
 */
const ScChevron = styled.svg<{ $open: boolean }>`
  width: 0.6rem;
  height: auto;
  flex: none;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  transition: transform ${({ theme }) => theme.data.motion.duration.fast}
    ${({ theme }) => theme.data.motion.easing.standard};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/*
 * Panel de un grupo: flota bajo su disparador (`position: absolute; top:
 * 100%`) con el mismo cristal que `ScSurface` (bg/blur, `-webkit-`
 * primero, igual orden de fallback), su borde, su radio y `elevation[2]`,
 * por encima del resto de la barra (`zIndex.dropdown`).
 *
 * REGLA DURA de esta tarea: el panel se renderiza SIEMPRE -- sus enlaces
 * nunca se desmontan -- y abre/cierra con `opacity`/`transform`/
 * `visibility` + el atributo `inert`, nunca desmontaje condicional ni
 * `display: none`/`hidden`. Alternativas descartadas y por qué:
 *
 * - Desmontarlo (`{isOpen && <ScNavPanel>...}`) o usar el atributo
 *   `hidden` sacan sus enlaces del DOM por completo: (a) dejarían de ser
 *   rastreables por cualquier código que los busque por `href`, y (b)
 *   romperían el test de regresión YA EXISTENTE en Navbar.test.tsx ("en
 *   tema %s los 4 enlaces de sección están presentes en el DOM", que hace
 *   `container.querySelector('a[href="#story"]')` sin mirar si el panel
 *   está abierto).
 * - `display: none` no se puede interpolar -- no es una propiedad
 *   animable --, así que el panel aparecería y desaparecería de golpe en
 *   vez de con la transición que pide la presentación de esta tarea.
 *
 * `visibility` sí es la propiedad correcta para un desplegable CERRADO:
 * saca el contenido del árbol de accesibilidad y del orden de tabulación
 * (`opacity` sola NUNCA basta para ocultar un control interactivo: sus
 * enlaces seguirían siendo alcanzables por Tab mientras el panel es
 * invisible). `inert` lo refuerza de forma explícita.
 *
 * `visibility` SÍ entra en la lista de `transition` (no se deja fuera, ni
 * se conmuta con `transition-behavior: allow-discrete`, pensado para
 * OTRAS propiedades discretas como `display`): es la única propiedad de
 * esta lista con animación DISCRETA ya definida por la propia
 * especificación de CSS Transitions, implementada en los motores desde
 * mucho antes de que existiera `allow-discrete`. Al pasar de `hidden` a
 * `visible` el cambio se aplica al INICIO de la duración (t=0) -- el
 * panel se vuelve interactivo y anunciable justo cuando arranca el
 * fade-in --, y al pasar de `visible` a `hidden` se aplica al FINAL
 * (t=1) -- el panel sigue pintando y permanece en el árbol de
 * accesibilidad durante TODO el fade-out, y solo desaparece cuando la
 * animación ya terminó. Es el "retardo" que pide la tarea, nativo del
 * navegador, sin ninguna sintaxis extra.
 *
 * Task 9 (craft de interacción, punto 5 del brief): transform-origin: top
 * left (el panel cuelga desde su disparador, arriba-izquierda, ver
 * `position: absolute; top: 100%; left: 0` de más abajo -- el encogimiento
 * de scale tiene que anclarse ahí, no al centro por defecto, o el panel
 * "flotaría" hacia el centro de su propia caja al cerrarse). El estado
 * cerrado suma `scale(OVERLAY.closedScale)` al `translateY` que ya tenía.
 * Asimetría 120/180 (regla 26 de RULES.md, mismo patrón que ScBar más
 * arriba: DOS declaraciones de `transition` -- base y `[data-open="true"]`
 * -- sin estado de React nuevo): abrir tarda más (`OVERLAY.openMs`) que
 * cerrar (`OVERLAY.closeMs`) porque abrir pide tiempo de lectura y cerrar
 * no. `visibility` se queda en la lista, mismo patrón que ya tenía.
 *
 * Los tres valores (`openMs`/`closeMs`/`closedScale`) ya NO viven aquí ni en
 * `navOverlay.transition.ts` (retirado): desde Task 17 (plan premium F1-F5,
 * 2026-08-11) son `OVERLAY` en `src/motion/vocabulary.ts` -- "valores del
 * vocabulario" en su propio brief --, compartidos con la hoja de navegación
 * móvil, que desde esa misma tarea usa la gramática COMPLETA (incluida la
 * escala de cierre, antes exclusiva de este panel; ver el docblock de
 * `OVERLAY` para el porqué del cambio) y no solo las dos duraciones.
 */
const ScNavPanel = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: ${({ theme }) => theme.data.space[2]};
  min-width: 12rem;
  padding: ${({ theme }) => theme.data.space[2]};
  border-radius: ${({ theme }) => theme.data.radius.lg};
  border: ${({ theme }) => theme.data.glass.border};
  background: ${({ theme }) => theme.data.glass.bg};
  -webkit-backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  backdrop-filter: ${({ theme }) => theme.data.glass.blur};
  box-shadow: ${({ theme }) => theme.data.elevation[2]};
  z-index: ${({ theme }) => theme.data.zIndex.dropdown};

  transform-origin: top left;
  visibility: hidden;
  opacity: 0;
  transform: translateY(-4px) scale(${OVERLAY.closedScale});
  pointer-events: none;
  transition:
    opacity ${OVERLAY.closeMs}ms ${PRESS.easing},
    transform ${OVERLAY.closeMs}ms ${PRESS.easing},
    visibility ${OVERLAY.closeMs}ms ${PRESS.easing};

  /* Divergencia deliberada con ScNavSheet/ScSheetVeil (NavSheet.tsx): alli
     la lista de apertura RETIRO visibility (medido en Chrome real, 375x812:
     con visibility en esa lista, el focus() que mete el foco en la primera
     fila de la hoja se ejecutaba en el instante en que visibility todavia
     computaba hidden, y un elemento hidden no es focalizable -- ver el
     docblock de ScNavSheet y el candado de Navbar.test.tsx:1447). Este
     panel de escritorio SI mantiene visibility en la lista de apertura,
     abajo, porque el hallazgo no aplica hoy: abrir este panel no mueve el
     foco a ningun elemento suyo (no hay ningun focus() equivalente en su
     apertura), asi que no hay ningun tick en el que algo intente
     focalizarse contra un panel que todavia computa hidden. Es una
     divergencia LATENTE, no un descuido: si este panel gana algun dia un
     focus() propio al abrirse, retirar visibility de ESTA lista de
     apertura, mismo criterio que NavSheet.tsx. */
  &[data-open="true"] {
    visibility: visible;
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
    transition:
      opacity ${OVERLAY.openMs}ms ${PRESS.easing},
      transform ${OVERLAY.openMs}ms ${PRESS.easing},
      visibility ${OVERLAY.openMs}ms ${PRESS.easing};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    /* Mismo hallazgo 4 que ScBar (ver su comentario, más arriba): el
       estado anidado [data-open="true"] (arriba) redeclara SU PROPIA
       transition con mayor especificidad (atributo + clase) que el & suelto
       de este bloque reduce (solo clase) -- sin redeclararlo aquí dentro,
       bajo reduce el panel abierto seguiría animando con PRESS.easing en
       vez de "none". */
    &[data-open="true"] {
      transition: none;
    }
  }
`;

const ScNavPanelList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};
  margin: 0;
  padding: 0;
  list-style: none;
`;

/* Enlaces del panel: mismo rol visual que `ScNavLink` -- reutilizado por
   composición (`styled(ScNavLink)`), no duplicado -- más la presentación
   propia de un item de menú (bloque, con su propio relleno para que toda
   la fila sea zona de clic, no solo el texto). `display: flex` (en vez del
   `block` anterior) + `gap` acomodan el punto de sección activa de más
   abajo sin desplazar el texto cuando el punto está invisible. */
/*
 * Indicador de sección activa (Tarea 1, navegación accesible). Ligado al
 * MISMO estado que decide `aria-current` más abajo -- nunca una segunda
 * fuente de verdad -- y expresado con un token de tema (`semantic.brand`),
 * no un color nuevo, tal y como pide el brief. Solo `opacity`/`transform`
 * animan (regla 18 de RULES.md): el punto nace en `opacity: 0` /
 * `scale(0.5)` y crece a `1`/`1` cuando el enlace es el activo -- no se
 * toca `color` ni `font-weight` del texto, para no competir con el cambio
 * de `color` que ya anima `:hover`/`:focus-visible` en `ScNavLink`.
 *
 * Solo los items `kind: "section"` reciben `aria-current` (ver
 * `NavGroupMenu`, más abajo), así que el `::before` de los demás items
 * (discover/resources/community) se queda siempre en `opacity: 0` -- un
 * espacio reservado invisible que además alinea el texto de todos los
 * items del panel al mismo margen izquierdo.
 *
 * `navActiveAccent(theme)`, NO `semantic.brand` a secas (fix wave A,
 * hallazgo A4, WCAG 1.4.11): `semantic.brand` medía 2.277:1 sobre la hoja y
 * 2.246:1 sobre el panel en tema claro, por debajo del 3:1 que exige un
 * indicador de estado no textual. Ver el docblock de `navActiveAccent`
 * (`NavSheet.tsx`) para las cuatro cifras completas y el porqué de la
 * resolución por rama.
 *
 * TAMAÑO `space[2]` (8px), antes `space[1]` (4px) -- crítica externa #11,
 * hallazgo A, P2. El contraste ya estaba resuelto (5.8:1 medido por el
 * evaluador, holgado sobre el 3:1 de WCAG 1.4.11) y el defecto que quedaba era
 * de TAMAÑO: 4x4 px es un indicador que hay que buscar, no uno que se ve. Es
 * el ÚNICO signo de "estás aquí" del panel -- por decisión declarada tres
 * párrafos más arriba, ni `color` ni `font-weight` del texto cambian, para no
 * competir con el `color` que ya anima `:hover`/`:focus-visible`; esa decisión
 * NO se revierte, precisamente porque doblar el punto resuelve la legibilidad
 * sin tocar el eje que ya estaba ocupado.
 *
 * `space[2]` y no otro valor: es EXACTAMENTE el diámetro que la ola anterior
 * dejó en la marca del raíl de Journey (`ScJourneyRailMark`,
 * `journey.deck.tsx`, "el punto sigue midiendo space[2] (8px)"), que es el otro
 * indicador de posición del sitio. Misma familia, mismo token, sin inventar un
 * lenguaje nuevo para el mismo trabajo. La gramática de animación no cambia:
 * sigue naciendo en `opacity: 0` / `scale(0.5)` y creciendo a `1`/`1`, así que
 * el reposo pasa de 2px a 4px de punto escalado y el activo de 4px a 8px.
 *
 * El texto no se mueve por su cuenta: el `gap` de la fila lo separa del punto,
 * así que los 4px que crece el punto desplazan el texto de TODOS los items por
 * igual (el `::before` existe siempre, invisible, en los que no son la sección
 * activa -- ver el párrafo de arriba), sin descolocar unos respecto a otros.
 */
const ScNavPanelLink = styled(ScNavLink)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.data.space[2]};
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.space[2]};

  &::before {
    content: "";
    /* space[2] (8px), no space[1]: ver el docblock de arriba (crítica externa
       #11) -- mismo diámetro que la marca del rail de Journey. */
    width: ${({ theme }) => theme.data.space[2]};
    height: ${({ theme }) => theme.data.space[2]};
    flex: none;
    border-radius: ${({ theme }) => theme.data.radius.full};
    background: ${({ theme }) => navActiveAccent(theme)};
    opacity: 0;
    transform: scale(0.5);
    transition:
      opacity ${({ theme }) => theme.data.motion.duration.fast}
        ${({ theme }) => theme.data.motion.easing.standard},
      transform ${({ theme }) => theme.data.motion.duration.fast}
        ${({ theme }) => theme.data.motion.easing.standard};
  }

  &[aria-current="location"]::before {
    opacity: 1;
    transform: scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
`;

/*
 * Un grupo desplegable individual. Vive fuera de `Navbar()` porque cada
 * instancia necesita SU PROPIO `useId()` (disparador + panel) y SU PROPIA
 * referencia al disparador (para devolverle el foco al cerrar con Escape,
 * regla 3): subir esos valores al componente padre obligaría a indexarlos
 * a mano por `NavGroupKey` sin ganar nada frente a que cada grupo resuelva
 * lo suyo.
 */
interface NavGroupMenuProps {
  readonly group: NavGroup;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
  /** `key` de la sección actualmente visible (`useActiveSectionKey`), o
   *  `null` si ninguna lo está. Solo los items `kind: "section"` lo
   *  consumen (ver `itemLabel`/`aria-current` más abajo). */
  readonly activeSectionKey: string | null;
}

function NavGroupMenu({
  group,
  isOpen,
  onToggle,
  onClose,
  activeSectionKey,
}: NavGroupMenuProps): ReactElement {
  const { t } = useTranslation("common");
  const triggerId = useId();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Regla 3: Escape cierra el grupo (si estaba abierto) y devuelve el foco
  // a su disparador.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Escape" || !isOpen) return;
    onClose();
    triggerRef.current?.focus();
  }

  // Regla 5: el foco saliendo del grupo (disparador + panel) hacia un
  // elemento que no esté dentro lo cierra. `relatedTarget` es el elemento
  // que GANA el foco; si no está contenido en este grupo, se cierra.
  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    onClose();
  }

  // Regla 6: activar un enlace del panel lo cierra -- si no, el salto al
  // ancla deja un panel flotando sobre la página.
  //
  // Y, desde la crítica externa #8 (punto 3), mueve el foco al titular de
  // destino cuando ese destino es una tarjeta de Features (ver
  // `navAnchorFocus.ts`; los demás items salen por su guarda sin tocar el
  // foco). ORDEN DELIBERADO: `onClose()` primero, `focus()` después. El
  // cierre es un `setState`, así que en este instante el panel todavía no es
  // `inert` ni `visibility: hidden` -- y no importa, porque el elemento que
  // gana el foco vive FUERA del panel. Lo que sí importa es no invertirlo:
  // enfocar antes de pedir el cierre dejaría el `focus()` a merced de lo que
  // el re-render haga después.
  function handleLinkActivate(item: NavItem): void {
    onClose();
    focusNavAnchorTarget(item);
  }

  /* Señal visible de sección actual con el panel plegado (ver el docblock de
     `ScNavTrigger`). Se deriva del MISMO `activeSectionKey` que decide
     `aria-current` más abajo -- nunca un segundo estado -- y con el MISMO
     predicado (`kind === "section"`), así que no puede encenderse por un item
     que no represente una sección real. */
  const hasActiveSection = group.items.some(
    (item) => item.kind === "section" && item.key === activeSectionKey,
  );

  function itemLabel(item: NavItem): string {
    switch (item.kind) {
      case "section":
        return t(`Common.Navigation.${item.key}`);
      case "feature":
        return t(`home:Home.features.${item.key}.title`);
      case "external":
        return t(`Common.Nav.${item.key}`);
    }
  }

  return (
    <ScNavGroup
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <ScNavTrigger
        type="button"
        id={triggerId}
        ref={triggerRef}
        $current={hasActiveSection}
        aria-expanded={isOpen}
        aria-controls={panelId}
        /*
         * SIN `aria-haspopup`, y su ausencia es la parte deliberada
         * (crítica externa #8, punto 2). Lo declaró la Tarea 1 con el valor
         * genérico `"true"`, razonando que el panel no es un `role="menu"` y
         * que por tanto `"menu"` habría sido peor. La conclusión correcta era
         * la contraria: si esto no es un menú, `aria-haspopup` sobra ENTERO.
         *
         * `aria-haspopup` anuncia "este control abre un elemento emergente
         * con semántica propia" -- menu, listbox, tree, grid o dialog -- y el
         * valor `"true"` es exactamente sinónimo de `"menu"` en WAI-ARIA, no
         * un "algo emergente" genérico. Un lector de pantalla lo anuncia como
         * "menú" y su usuario espera lo que un menú ofrece: flechas para
         * recorrer los items, Home/End, escritura para saltar. Nada de eso
         * existe aquí -- son enlaces normales navegables por Tab -- así que el
         * atributo estaba prometiendo un teclado que no se implementa.
         *
         * El patrón que este componente SÍ implementa es el disclosure de
         * APG: un `<button>` con `aria-expanded` + `aria-controls` que revela
         * una lista de enlaces. Ese patrón NO lleva `aria-haspopup`, y ese
         * par de atributos (justo arriba) ya comunica todo lo que hay que
         * comunicar: que el control se expande y qué región controla.
         *
         * No se implementa `role="menu"` con su teclado en su lugar a
         * propósito: un menú ARIA es la semántica de una aplicación (comandos
         * que actúan sobre algo), no la de un índice de navegación por
         * enlaces, y añadir flechas obligaría además a sacar los enlaces del
         * orden de tabulación (`tabindex="-1"` + roving) -- más teclado que
         * aprender a cambio de ninguna capacidad nueva.
         */
        onClick={onToggle}
      >
        {t(`Common.Nav.${group.key}`)}
        <ScChevron
          viewBox="0 0 12 8"
          aria-hidden="true"
          focusable="false"
          $open={isOpen}
        >
          <path
            d="M1 1.5 6 6.5 11 1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ScChevron>
      </ScNavTrigger>
      <ScNavPanel
        id={panelId}
        aria-labelledby={triggerId}
        data-open={isOpen}
        inert={!isOpen}
      >
        <ScNavPanelList>
          {group.items.map((item) =>
            item.kind === "external" ? (
              <li key={item.key}>
                <ScNavPanelLink
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleLinkActivate(item)}
                >
                  {itemLabel(item)}
                  {/* Espacio literal DENTRO del texto oculto, no entre nodos
                      JSX (que la compilación colapsaría): sin él, el
                      `textContent` del ancla queda pegado ("VTI - SDKse abre
                      en...") y un lector de pantalla que lo lea como una sola
                      cadena pronuncia una palabra inexistente. Mismo criterio
                      ya aplicado en `Footer.tsx` para este mismo aviso. */}
                  <VisuallyHidden> {t("Common.Nav.newTab")}</VisuallyHidden>
                </ScNavPanelLink>
              </li>
            ) : (
              <li key={item.key}>
                <ScNavPanelLink
                  href={item.href}
                  onClick={() => handleLinkActivate(item)}
                  /*
                   * Punto 1 del brief (Tarea 1): solo los items
                   * `kind: "section"` representan una sección real de la
                   * home -- "discover" apunta también a "#features" pero
                   * son títulos de contenido (Learning/Imagination/Gaming),
                   * no destinos de scrollspy propios. `"location"`, no
                   * `"true"`: WAI-ARIA reserva ese valor para "la posición
                   * actual dentro de un documento o contexto que el
                   * usuario está recorriendo" -- exactamente este caso
                   * (un enlace de sección que refleja dónde está el
                   * scroll), y es más preciso que el genérico `"true"`.
                   * `undefined`, no `"false"`, cuando no es la activa: así
                   * el atributo desaparece del DOM en vez de quedar
                   * anunciado como "no es la actual" en cada enlace.
                   */
                  aria-current={
                    item.kind === "section" && item.key === activeSectionKey
                      ? "location"
                      : undefined
                  }
                >
                  {itemLabel(item)}
                </ScNavPanelLink>
              </li>
            ),
          )}
        </ScNavPanelList>
      </ScNavPanel>
    </ScNavGroup>
  );
}

export function Navbar(): ReactElement {
  const { scrolled, phase: detachPhase } = useNavDetach(8);
  /*
   * IDIOMA DE LA PÁGINA (crítica #12, P0), leído del proveedor de i18next que
   * ya monta la rama de rutas (`app/(es)/layout.tsx` / `app/en/layout.tsx` ->
   * `Providers locale=...` -> `I18nProvider`). No se infiere de la URL con
   * `usePathname()`: el idioma es una propiedad del ÁRBOL, fijada por la
   * posición del fichero de layout, así que el valor es el mismo en el HTML que
   * hornea el build y en el primer render del cliente -- cero riesgo de
   * mismatch de hidratación bajo `output: "export"`.
   *
   * `NAV_GROUPS` deja de consumirse directamente aquí: en `/en` sus `href`
   * empiezan por `/` y devolvían al visitante inglés a la home castellana en
   * los 7 destinos de la barra (ver el docblock de `navGroupsFor`).
   */
  const { i18n } = useTranslation("common");
  const navGroups = navGroupsFor(i18n.language);
  // Este componente ya no consume useStage(): desde la revisión 2026-08-11 su
  // entrada de carga es una @keyframes estática con animation-delay =
  // HERO_CHROME_OFFSET_MS (ver el docblock de ScHeader). No necesita que nadie
  // le avise de nada porque su entrada viaja en el CSS del HTML exportado: se
  // ve sin esperar a que el bundle descargue ni a que React hidrate, y también
  // con JavaScript deshabilitado -- que es el caso que antes la dejaba
  // invisible para siempre.
  // Tarea 1 (navegación accesible): sección de la home actualmente visible,
  // reutilizando el motor ya montado por `useSectionProgress` en cada
  // sección (ver el docblock de `useActiveSection.ts`). Se lee aquí, una
  // sola vez, y se reparte a cada `NavGroupMenu` -- ninguno vuelve a
  // suscribirse por su cuenta.
  const activeSectionKey = useActiveSectionKey();

  /*
   * Regla 1: un solo grupo abierto a la vez -- un único estado
   * `NavGroupKey | null`, nunca un booleano por grupo. Abrir un segundo
   * grupo (regla 2) se resuelve por construcción: `toggleGroup` sobrescribe
   * este único valor, así que el grupo que estuviera abierto deja de serlo
   * sin tener que coordinar N estados booleanos entre sí.
   */
  const [openGroup, setOpenGroup] = useState<NavGroupKey | null>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  /*
   * Hoja de navegación móvil (Task 10). El estado vive AQUÍ, y no dentro de
   * la propia hoja, porque sus dos piezas no tienen ancestro común: el
   * disparador va dentro de la barra y la hoja tiene que salir de
   * `ScHeader` para que su `position: fixed` se resuelva contra el viewport
   * y no contra la barra (`ScHeader` declara `transform`, y un ancestro con
   * `transform` se convierte en el bloque contenedor de los `fixed` de su
   * interior). Mismo reparto que `NavGroupMenu`, que también recibe su
   * estado desde aquí.
   */
  const sheet = useNavSheet();

  const closeGroup = useCallback((): void => {
    setOpenGroup(null);
  }, []);

  const toggleGroup = useCallback((key: NavGroupKey): void => {
    setOpenGroup((current) => (current === key ? null : key));
  }, []);

  /*
   * Regla 4: un click/pointerdown fuera del BLOQUE DE NAVEGACIÓN completo
   * (todos los grupos, no solo el que está abierto) cierra el grupo
   * abierto. Se escucha en `document` porque el click puede caer en
   * cualquier parte de la página -- desde el resto de `ScHeader` hasta el
   * fondo de una sección --, y SOLO mientras haya un grupo abierto: sin
   * grupo abierto no hay nada que cerrar ni listener que mantener vivo, y
   * el propio `return` de limpieza (regla 7) lo retira en cuanto
   * `openGroup` cambia o el componente se desmonta.
   */
  useEffect(() => {
    if (openGroup === null) return;

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (navLinksRef.current?.contains(event.target)) return;
      setOpenGroup(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openGroup]);

  /*
   * ACCESIBILIDAD durante el intro: la entrada SOLO anima
   * `opacity`/`transform`. Nunca `display:none`, `visibility:hidden` ni
   * `aria-hidden` -- con opacity 0 el elemento sigue en el árbol de
   * accesibilidad, sigue en el orden de tabulación y un `Tab` durante el
   * tramo de carga sigue moviendo el foco a sus controles con normalidad
   * (verificado leyendo la especificación de accesibilidad de CSS opacity:
   * a diferencia de `visibility`/`display`, `opacity` no altera ni el árbol
   * de accesibilidad ni la secuencia de tabulación). El tramo es un retardo
   * fijo de HERO_CHROME_OFFSET_MS (~0.76s) y bajo `prefers-reduced-motion:
   * reduce` no llega a producirse -- el CSS de ScHeader fuerza visible de
   * inmediato en ese caso -- así que no hace falta ningún tratamiento
   * adicional de foco.
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
    <>
      <ScHeader
        data-scrolled={scrolled}
        data-detach={detachPhase}
      >
        <ScBar>
          <ScSurface
            aria-hidden="true"
            data-nav-surface
          />
          <ScNav>
            {/* `routePath("home", locale)`, no `"/"` (crítica #12, P0): en
              `/en` el logotipo era el enlace que devolvía al visitante inglés a
              la home castellana -- el gesto más habitual de "volver al
              principio" y el que perdía el idioma sin avisar. En castellano
              resuelve exactamente al `/` de siempre. */}
            {/* `prefetch={false}`: MISMO bug y MISMO criterio que ya
              documentan `Footer.tsx` (enlaces legales) y `LanguageSelector.tsx`
              -- bug abierto de Next 16 en export estático (vercel/next.js
              #85374 y #92341, reproducido en 16.2.11, Task 28): el prefetch de
              segmento RSC pide `__next.<ruta>.__PAGE__.txt` (plano) y
              `output: "export"` genera `__next.<ruta>/__PAGE__.txt` (anidado),
              así que SIEMPRE devuelve 404. Este era el `<Link>` que faltaba por
              cerrar dentro de la barra: es el logotipo, está presente en TODAS
              las páginas del sitio y su destino (`/` o `/en`) es justo el que
              Next intenta prefetchar en cuanto entra en el viewport -- es decir,
              en cada carga, sin que nadie interactúe. El click sigue navegando
              igual (Next cae al fetch de página completa); lo único que la prop
              evita es el 404 en consola. Reversión: cuando el fix llegue aguas
              arriba y se verifique con el mismo repro, retirar la prop en los
              tres consumidores a la vez. */}
            <ScBrandLink
              href={routePath("home", navLocale(i18n.language))}
              prefetch={false}
            >
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
            {/* `data-nav-links`: gancho de test del guard sin JavaScript
              (crítica externa #11, hallazgo A). Mismo criterio que
              `data-nav-surface` de arriba y que `data-theme-toggle`
              (`ThemeToggle.tsx`) -- un `data-*` sobre un elemento del DOM no
              obliga a declarar nada en la interfaz de props de nadie, y el
              `ref` de al lado no sirve como gancho: lo consume el listener de
              click fuera, que es JavaScript y por tanto justo lo que no corre
              en el escenario que el candado mide. */}
            <ScNavLinks
              ref={navLinksRef}
              data-nav-links
            >
              {navGroups.map((group) => (
                <NavGroupMenu
                  key={group.key}
                  group={group}
                  isOpen={openGroup === group.key}
                  onToggle={() => toggleGroup(group.key)}
                  onClose={closeGroup}
                  activeSectionKey={activeSectionKey}
                />
              ))}
            </ScNavLinks>
            <ScActions>
              <ScBarLanguage>
                <LanguageSelector />
              </ScBarLanguage>
              <ThemeToggle />
              {/* Último de la fila: la posición convencional del disparador
                de un menú móvil. Con `display: none` desde `md` no genera
                caja, así que no aporta hueco de `gap` ni desplaza nada en
                escritorio -- la barra queda idéntica a como estaba. */}
              <NavSheetTrigger
                isOpen={sheet.isOpen}
                onToggle={sheet.toggle}
                triggerId={sheet.triggerId}
                sheetId={sheet.sheetId}
                triggerRef={sheet.triggerRef}
              />
            </ScActions>
          </ScNav>
        </ScBar>
      </ScHeader>
      {/* FUERA de ScHeader a propósito: `ScHeader` declara `transform`, y un
          ancestro con `transform` pasa a ser el bloque contenedor de
          cualquier `position: fixed` de su interior -- dentro de la barra,
          el `bottom: 0` de la hoja se resolvería contra los 56 px de la
          banda en vez de contra el borde inferior de la pantalla. Ver el
          docblock de `ScNavSheet` (`NavSheet.tsx`). */}
      {/* Sin `triggerId` desde la crítica externa #9 (punto 2): la hoja ya no
          se nombra con el id de su disparador -- ese vínculo le daba el nombre
          «Cerrar el menú de navegación», la etiqueta del BOTÓN en estado
          abierto. Ahora declara su propio `aria-label` (ver el JSX de
          `NavSheet`), así que la prop se retira en vez de quedarse sin
          consumidor (regla 16). `sheet.triggerId` sigue vivo: lo consume
          `NavSheetTrigger`, que necesita el id para su propio `id=` y para
          que el `aria-controls` del par siga cerrando el círculo. */}
      <NavSheet
        isOpen={sheet.isOpen}
        onNavigate={sheet.close}
        onClose={sheet.closeAndFocusTrigger}
        sheetId={sheet.sheetId}
        sheetRef={sheet.sheetRef}
      />
    </>
  );
}
