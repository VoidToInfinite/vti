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
import { forcedColorsButtonShape } from "@/components/ui/Button/Button";
import { Logo } from "@/components/ui/Logo/Logo";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden/VisuallyHidden";
import {
  navBarMoreGroupsFor,
  navBarSectionsFor,
  navBarWideSectionsFor,
  navLocale,
  type NavGroup,
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
import { NAVBAR_CONTAINER, NAVBAR_WIDE_QUERY } from "./navbarContainer";

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

/*
 * LA CABECERA NO SE PUEDE PULSAR MIENTRAS ES INVISIBLE (crítica #14, P1).
 *
 * EL DEFECTO, medido por el evaluador sobre el sitio servido: `opacity` es la
 * propiedad que oculta la barra durante el intro, y `opacity: 0` NO desactiva
 * los eventos de puntero. Con JavaScript la barra computaba opacidad 0 hasta
 * ~1,2 s y no llegaba a 1,00 hasta ~1,9 s; sin JavaScript seguía en 0 hasta
 * ~1,7 s. Durante toda esa ventana el conmutador de tema, el selector de
 * idioma, el logotipo y la hamburguesa recibían clics que el usuario no podía
 * ver ni prever: pulsar donde va a estar la barra activaba el control que
 * todavía no se ve.
 *
 * POR QUÉ UNA ANIMACIÓN HERMANA Y NO OTRA COSA. La coreografía no se toca (el
 * retardo de HERO_CHROME_OFFSET_MS y la curva siguen siendo los mismos), y la
 * regla de la casa —solo `opacity`/`transform` se ANIMAN— tampoco: esta
 * segunda animación no interpola nada. `pointer-events` es una propiedad de
 * animación DISCRETA por especificación, así que solo puede SALTAR entre dos
 * valores; el `99%` la mantiene en `none` durante prácticamente toda la
 * duración y el salto cae al final, cuando la barra ya es visible. Sin ese
 * `99%` (con solo `from`/`to`) el salto de una animación discreta ocurre a
 * MITAD de la duración, es decir con la barra a medio aparecer.
 *
 * QUÉ NO SE USA, y por qué está prohibido aquí: ni `display: none`, ni
 * `visibility: hidden`, ni `aria-hidden`. Los tres sacarían el navbar del
 * orden de tabulación y del árbol de accesibilidad durante el intro, que es
 * justo lo que el comentario de accesibilidad de `ScHeader` (más abajo) y el
 * de `Navbar()` prohíben: un `Tab` durante la carga tiene que seguir llegando
 * a los controles. `pointer-events` no toca ninguna de las dos cosas -- solo
 * el ratón y el dedo, que son exactamente los que no pueden ver dónde pulsan.
 *
 * FILL BACKWARDS lo cubre entero: durante el retardo el valor efectivo es el
 * del keyframe `0%` (`none`), y al terminar la animación —sin `forwards`— la
 * propiedad vuelve al valor de reposo declarado en `ScHeader`
 * (`pointer-events: auto`), sin necesidad de JavaScript ni de ningún estado.
 * Bajo `prefers-reduced-motion: reduce` la barra ya es visible de inmediato y
 * el bloque de reduce apaga las DOS animaciones con `animation: none`, así que
 * la barra nace pulsable: no hay ninguna ventana muerta que arreglar ahí.
 */
const navbarArm = keyframes`
  0%,
  99% {
    pointer-events: none;
  }
  100% {
    pointer-events: auto;
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
  /* Valor de reposo al que vuelve navbarArm cuando la animación termina (sin
     fill forwards) y el que rige bajo reduce, donde no hay animación ninguna.
     Declarado aunque coincida con el inicial de CSS: es el otro extremo del
     contrato que documenta navbarArm, y sin él ese contrato solo existiría en
     un comentario. (Sin comillas invertidas dentro del template: regla 23 de
     RULES.md, ya ha roto el build cuatro veces.) */
  pointer-events: auto;
  /* DOS nombres, un solo juego de duración/retardo/curva/fill: la lista de
     animation-name se empareja con las demás longhands repitiendo sus
     valores, así que las dos animaciones comparten exactamente el mismo reloj
     -- que es justo lo que hace falta para que el puntero se libere cuando la
     barra termina de aparecer, y no un instante antes o después. */
  animation-name: ${navbarDrop}, ${navbarArm};
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
   *
   * Lo que SÍ se desactiva en ese tramo, desde la crítica #14 (P1), es el
   * puntero: opacity 0 no impide un clic, así que la barra invisible recibía
   * pulsaciones a ciegas. Lo resuelve navbarArm (ver su docblock), una
   * animación hermana sobre pointer-events -- una propiedad que no toca ni el
   * orden de tabulación ni el árbol de accesibilidad, así que no contradice
   * ni una línea de este párrafo.
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

  /*
   * SIN JAVASCRIPT LA CABECERA VUELVE AL FLUJO (crítica externa #17, P1 del
   * evaluador Nielsen, 2026-09-03).
   *
   * position: fixed existe para UNA cosa: que la barra flote sobre el hero
   * transparente y se convierta en cristal al scrollear. Ese segundo estado
   * lo escribe data-scrolled, que sale de useScrolled -- estado de React. Sin
   * JavaScript el atributo no se pone nunca, ScSurface se queda en opacity 0
   * para siempre y lo único que queda de la barra fija es una capa
   * transparente que tapa contenido al hacer scroll y que, en cuanto muestra
   * los destinos de sección (ver ScNavLinks, más abajo), envuelve a dos o
   * tres filas de alto sobre el texto de la página.
   *
   * En flujo, la banda mide lo que mide su contenido, empuja el hero hacia
   * abajo en vez de taparlo, y el salto a un ancla aterriza donde tiene que
   * aterrizar sin depender de que scroll-margin-top (GlobalStyles) adivine la
   * altura de una barra que ahora envuelve. Es exactamente lo que pedía el
   * encargo: la fila de destinos, en flujo, envolviendo si hace falta.
   *
   * QUÉ NO CAMBIA: con JavaScript no cambia absolutamente nada -- este bloque
   * entero no se evalúa. Y en un navegador sin soporte de scripting (Chrome
   * < 120, Firefox < 113, Safari < 17) el bloque se ignora y queda el
   * comportamiento de siempre.
   */
  @media (scripting: none) {
    position: static;
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
  /*
   * ESTA CAJA YA NO ES EL CONTENEDOR DE CONSULTA, y el porqué es medible
   * (crítica externa #18, ola O+P). Lo fue desde O-3/O-4, pero es justo la
   * caja cuyo max-width ANIMA al despegarse: su caja de contenido encoge al
   * scrollear (medido: 992 -> 976, 1024 -> 1008, 1200 -> 1184 con la raíz por
   * defecto), así que las bandas 992-1007 y 1200-1215 px cruzaban el umbral
   * durante el propio scroll y el quinto destino aparecía arriba y se iba al
   * bajar. El contenedor vive ahora en ScNav, cuya caja de contenido sale
   * INVARIANTE en las dieciocho combinaciones medidas de ancho por tamaño de
   * fuente, porque su padding-inline cancela el desfase del despegue por
   * diseño. El reparto completo vive en navbarContainer.ts. (Sin comillas
   * invertidas dentro del template: regla 23 de RULES.md.)
   */
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
 * valor del raíl de siempre.
 */
/*
 * EL CONTENIDO DE LA BARRA VIVE EN EL RAÍL DE CONTENIDO DEL SITIO
 * (crítica externa #16, hallazgo L4 de Craft, 2026-09-03).
 *
 * EL DEFECTO, medido en navegador real (dev server, tema claro, barra
 * despegada, x del borde izquierdo de la píldora de marca frente a x del
 * contenido de `#features`/`#contact`/`footer`, que comparten raíl desde la
 * crítica #14):
 *
 *   ancho    marca    contenido    desfase
 *    1920      352          384       -32
 *    1600      192          224       -32
 *    1280       40           64       -24
 *    1100       40           24        +16   <- cambia de signo
 *
 * El desfase no solo existía: cambiaba de signo al estrecharse la ventana, así
 * que ningún lector podía interpretarlo como una sangría deliberada. La causa
 * es que la barra nunca tuvo raíl propio: su contenido colgaba del ancho de la
 * píldora (`grid.navMax`, 1280px) más un relleno de 16/32px por breakpoint,
 * mientras el contenido del sitio cuelga de `grid.containerMax` (1200px) más
 * `space[5]`. Dos orígenes distintos no pueden coincidir salvo por casualidad,
 * y de hecho solo coincidían en un punto (390px, donde los dos colapsan a 24).
 *
 * LA DECISIÓN: el contenido de la barra hereda el raíl del contenido, no la
 * geometría de su propia píldora. Es la opción (a) de las dos que planteaba el
 * encargo, y la que ya tomó el pie de página en la crítica #14 -- ver el
 * comentario de `ScInner` (`Footer.tsx`), que lo bajó de `space[6]` a
 * `space[5]` por este mismo motivo. Las dos bandas de chrome del sitio
 * (cabecera arriba, pie abajo) comparten ahora el raíl del contenido que
 * enmarcan, y ninguna de las dos lo escribe con números propios.
 *
 * QUÉ NO CAMBIA, y es importante para la spec 2026-07-31 (D7): la PÍLDORA
 * sigue midiendo `grid.navMax` (1280px). `navMax` y `containerMax` siguen
 * siendo dos medidas independientes que pueden divergir; lo que este bloque
 * declara es que la píldora es el CHROME y el raíl es del CONTENIDO, así que
 * el ancho de una no decide la sangría del otro. `ScHeader`/`ScBar`/
 * `ScSurface` quedan byte a byte como estaban.
 *
 * LA FORMA DEL RAÍL, y por qué no es `max-width` + `margin-inline: auto`:
 * porque la caja que centra a este elemento cambia de tamaño entre los dos
 * estados de la barra (`ScBar` va de `100vw` a `navMax`, y `ScHeader` le mete
 * `var(--nav-gap)` de hueco lateral al despegarse). Expresado como relleno
 * contra el ancho del PROPIO contenedor, el desfase se cancela solo:
 *
 *   sea B el ancho de `ScBar` y L su borde izquierdo respecto al viewport.
 *   Con el tope activo, `margin-inline: auto` centra la píldora, así que
 *   L = (W - B) / 2 -- el hueco lateral de `ScHeader` se cancela --, y
 *   L + (B - containerMax) / 2 + space[5] = (W - containerMax) / 2 + space[5],
 *   que es EXACTAMENTE el borde del contenido de la sección. La cifra no
 *   depende ni de B ni del hueco, así que la marca no se mueve ni un píxel
 *   durante toda la animación de despegue.
 *
 * EL SUELO (el término izquierdo del `max()`) es el que gobierna por debajo de
 * `containerMax`, donde el raíl ya no muerde y el contenido va a `space[5]` del
 * borde. Ahí sí entra el hueco de la píldora, y por eso el suelo del estado
 * despegado le RESTA `var(--nav-gap)`: la píldora ya ha movido su contenido
 * esos 8px hacia dentro, así que el relleno tiene que devolverlos para que la
 * marca siga cayendo sobre el raíl. Las dos formas del suelo transicionan con
 * la misma duración y curva que el `padding-inline` de `ScHeader` (`base` /
 * `standard`), así que los 8px que uno pone y el otro quita se compensan
 * fotograma a fotograma: sin esa transición, la marca daría un salto de 8px al
 * cruzar el umbral.
 *
 * LO QUE ESTE RAÍL NO ALINEA, declarado porque es deuda conocida del repo y no
 * un descuido de esta tarea (`RULES.md`, "Deuda conocida": la convivencia de
 * DOS raíles en la misma página es una decisión de diseño del dueño): las
 * secciones a sangre del tema oscuro y el deck claro de Journey cuelgan de
 * `grid.sectionMax` (1280px) + `space[6]`, y Story claro de `sectionMax` +
 * `space[5]`. Medido a 1920: 352 y 344 frente a los 384 de este raíl. Alinear
 * eso exige mover secciones, que no es de esta tarea ni de este fichero.
 */
const ScNav = styled.nav`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.data.space[4]};
  /*
   * LA BANDA ENVUELVE SIEMPRE, NO SOLO SIN JAVASCRIPT (crítica externa #18,
   * ola O+P: WCAG 1.4.4 a 200 % de tamaño de texto).
   *
   * EL DEFECTO, reproducido en Chrome real sobre el build de producción antes
   * de tocar nada (tema claro, DPR 1, visibilityState "visible", raíz del
   * documento a 32px -- el 200 % de la preferencia del usuario, el mismo
   * instrumento del docblock de ScBrandLink): con la fila en nowrap y altura
   * FIJA, el contenido pedía 1179 px a cualquier ancho, así que entre 992 y
   * 1152 el bloque de acciones salía del viewport. Medido a 1024: el
   * conmutador de tema en x 1135..1179, inViewport false, y
   * elementFromPoint en su centro devolviendo el arte del hero, no el botón.
   * Sin rescate posible: html/body están en overflow-x clip y
   * maxScrollLeft = 0, así que el control no se podía ni alcanzar ni
   * scrollear hasta él. El rótulo de la marca, en la misma medición, estaba
   * ya a ancho 0 -- el enlace a la home tampoco tenía zona de clic.
   *
   * LA CAUSA ERA HEREDADA, igual que la del bloque sin JavaScript de más
   * abajo: una altura fija más nowrap obligan a que TODO quepa en una fila de
   * alto constante, y cuando no cabe el sobrante no se pliega, se sale. La
   * respuesta que el repo ya tenía escrita para el caso sin JavaScript --
   * envolver, con la banda como SUELO y no como techo-- es la misma que
   * resuelve éste, así que sube a la regla base en vez de duplicarse en un
   * segundo guard: una consulta de medio o de contenedor habría necesitado
   * un umbral, y
   * ningún umbral separa los dos casos (a 375 px con la raíz a 16 el
   * contenedor mide 23,4em y NO debe envolver; a 1152 px con la raíz a 32
   * mide 36em y SÍ). No caber no es un ancho: es exactamente lo que
   * flex-wrap ya sabe decidir por su cuenta.
   *
   * NO CAMBIA NADA DONDE EL CONTENIDO YA CABÍA, y se midió caja por caja
   * antes de escribirlo: con la raíz a 16px, a 375, 800, 992, 1024, 1152,
   * 1280, 1440 y 1920 px las cajas de la cabecera salen IDÉNTICAS AL PÍXEL,
   * subárbol entero incluido. La única banda que cambia es 768-787 px, donde
   * hoy la fila "cabía" solo porque el nombre del sitio se recortaba
   * (medido a 768: scrollWidth 119 contra clientWidth 100 del span de la
   * marca, con overflow hidden -- 19 px del nombre del sitio perdidos); ahí
   * ahora la banda mide 96 px en dos filas y el nombre se lee entero.
   *
   * DESPUÉS, a 200 % y a los mismos anchos: cero desbordamiento
   * (scrollWidth === clientWidth en los ocho), el conmutador dentro del
   * viewport y elementFromPoint devolviéndolo en todos, y el rótulo de la
   * marca de vuelta a 301,72 px desde 0.
   *
   * row-gap y no gap: el hueco horizontal entre marca, destinos y controles
   * sigue siendo el space[4] de arriba; lo que hace falta aquí es separar las
   * filas cuando de verdad hay más de una.
   */
  flex-wrap: wrap;
  row-gap: ${({ theme }) => theme.data.space[2]};
  /*
   * CONTENEDOR DE CONSULTA DE LA FILA (crítica externa #18, O-3 y O-4, movido
   * aquí desde ScBar en la ola O+P). Las dos piezas que la barra estrena en esa
   * crítica se preguntan por el ancho DE ESTA CAJA y por el tamaño de fuente
   * que hereda, no por el de la ventana; y esta caja es la única de la banda
   * cuyo ancho de contenido no se mueve durante la animación de despegue. El
   * porqué completo, con las dos mediciones que lo obligan --la de 200 % de
   * fuente y la del umbral cruzado al scrollear-- vive en navbarContainer.ts.
   *
   * NO CAMBIA NADA DE LA COMPOSICIÓN, y se comprobó antes de escribirlo:
   * medido en Chrome real a 1024 y a 1440 sobre el build de producción, con el
   * panel de Más ABIERTO y con y sin esta declaración, todas las cajas de la
   * cabecera salen idénticas al píxel, con el mismo z-index y el mismo
   * elementFromPoint dentro del panel. Es lo esperado: el ancho de este bloque
   * lo fija su padre, nunca su contenido, así que la contención en el eje en
   * línea no tiene nada que restringir.
   */
  container-type: inline-size;
  container-name: ${NAVBAR_CONTAINER};
  /* La misma variable que descuenta el Hero (ver GlobalStyles): si la banda
     cambia de alto, las dos medidas cambian juntas. Es un SUELO, no una
     altura fija: donde el contenido cabe en una fila la banda mide
     exactamente lo que medía antes, al píxel (medido, ver arriba). */
  height: auto;
  min-height: var(--nav-height);
  padding-block: 0;
  padding-right: calc(
    max(
        ${({ theme }) => theme.data.space[5]},
        calc(
          (100% - ${({ theme }) => theme.data.grid.containerMax}) / 2 +
            ${({ theme }) => theme.data.space[5]}
        )
      ) +
      env(safe-area-inset-right, 0px)
  );
  padding-left: calc(
    max(
        ${({ theme }) => theme.data.space[5]},
        calc(
          (100% - ${({ theme }) => theme.data.grid.containerMax}) / 2 +
            ${({ theme }) => theme.data.space[5]}
        )
      ) +
      env(safe-area-inset-left, 0px)
  );
  /* Misma duración y curva que el padding-inline de ScHeader: ver el docblock
     de arriba, apartado del suelo. (Sin comillas invertidas dentro del
     template: regla 23 de RULES.md, ya ha roto el build cinco veces.) */
  transition:
    padding-left ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    padding-right ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  [data-scrolled="true"] & {
    padding-right: calc(
      max(
          calc(${({ theme }) => theme.data.space[5]} - var(--nav-gap)),
          calc(
            (100% - ${({ theme }) => theme.data.grid.containerMax}) / 2 +
              ${({ theme }) => theme.data.space[5]}
          )
        ) +
        env(safe-area-inset-right, 0px)
    );
    padding-left: calc(
      max(
          calc(${({ theme }) => theme.data.space[5]} - var(--nav-gap)),
          calc(
            (100% - ${({ theme }) => theme.data.grid.containerMax}) / 2 +
              ${({ theme }) => theme.data.space[5]}
          )
        ) +
        env(safe-area-inset-left, 0px)
    );
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    /* Mismo motivo que documenta ScBar en su propio bloque de reduce: el
       estado anidado con el atributo tiene MAYOR especificidad que el
       ampersand suelto, así que sin redeclararlo aquí dentro ganaría la
       transición con curva real del bloque de estado. */
    [data-scrolled="true"] & {
      transition: none;
    }
  }

  /*
   * SIN JAVASCRIPT LA BANDA ENVUELVE (crítica externa #17, P1 del evaluador
   * Nielsen, 2026-09-03). Con los destinos de sección visibles en móvil (ver
   * ScNavLinks) el contenido ya no cabe en una sola fila de 390 px, y una
   * altura FIJA de var(--nav-height) recortaría justo lo que aquel arreglo
   * existía para mostrar.
   *
   * LAS CUATRO DECLARACIONES DE ESTE BLOQUE SUBIERON A LA REGLA BASE en la
   * ola O+P, porque el mismo recorte resultó no ser exclusivo del caso sin
   * JavaScript: a 200 % de tamaño de texto ocurre igual CON JavaScript, y
   * peor (el conmutador de tema quedaba fuera del viewport, ver el docblock
   * de arriba). El bloque se queda por dos motivos que no son cosméticos:
   * documenta el caso que lo descubrió, y sigue siendo el candado de la
   * crítica #17 -- si alguien retirase la envoltura de la base, este bloque
   * la conservaría exactamente donde aquel evaluador la midió. Declarar los
   * MISMOS valores que la base es aquí una redundancia deliberada, no una
   * divergencia: mismo peso, mismos valores, resultado idéntico.
   *
   * row-gap y no gap: el gap horizontal entre marca, destinos y controles
   * sigue siendo el de space[4] declarado arriba; lo que hace falta aquí es
   * separar las filas nuevas, que antes no existían.
   */
  @media (scripting: none) {
    flex-wrap: wrap;
    height: auto;
    min-height: var(--nav-height);
    row-gap: ${({ theme }) => theme.data.space[2]};
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
  /* Solo el TAMAÑO del peldaño wordmark (crítica externa #15, 2026-09-02): el
     1.15rem estaba escrito byte a byte aquí y en LegalHeader.tsx. El peso y el
     tracking los pone el propio rótulo (BrandName), no este enlace. */
  font-size: ${({ theme }) => theme.data.type.scale.wordmark.size};
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

  /*
   * SIN JAVASCRIPT EL IDIOMA VUELVE A LA BARRA TAMBIÉN EN MÓVIL (crítica
   * externa #17, P1 del evaluador Nielsen, 2026-09-03).
   *
   * La copia móvil del selector vive DENTRO de la hoja (ver el docblock de
   * NavSheet.tsx), y la hoja no abre nunca sin JavaScript: la consecuencia
   * medida es que bajo 768 px las DOS copias quedaban a 0x0 y el visitante se
   * quedaba sin forma de cambiar de idioma. Aquí no hay nada que dependa de
   * JavaScript --LanguageSelector pinta dos <a href> a / y /en desde
   * la crítica #10 (ver su docblock)--, así que la copia de la barra puede
   * encenderse tal cual.
   *
   * NO DUPLICA EL CONTROL, y esto había que comprobarlo antes de encenderlo:
   * sin JavaScript la hoja se queda para siempre en visibility: hidden +
   * inert (los dos ya horneados en el HTML exportado, que se genera con
   * isOpen === false), y cualquiera de los dos basta para sacar su copia del
   * árbol de accesibilidad y del orden de tabulación. Sigue habiendo
   * exactamente UNA copia anunciable, igual que en el reparto por md -- la
   * diferencia es que allí la excluyente es display: none y aquí es el
   * estado cerrado del que la hoja ya no puede salir.
   *
   * Va después del bloque de md y declara los mismos valores, así que en
   * escritorio sin JavaScript no cambia un píxel.
   */
  @media (scripting: none) {
    display: inline-flex;
    align-items: center;
  }
`;

/*
 * El bloque de navegación de la barra: desde la decisión D2 (2026-09-02,
 * crítica #14) son los CUATRO destinos de sección como enlaces visibles
 * (`ScNavSectionLink`) más UN disclosure («Más», `NavMoreMenu`) que agrupa el
 * resto. Hasta esa fecha eran cuatro disparadores desplegables y ni un enlace
 * visible; antes de la tarea W4, cuatro enlaces planos sin ningún desplegable.
 *
 * SOLO >= md CON JAVASCRIPT (mockup: barra angosta en breakpoints menores).
 * Bajo `md` la navegación NO desaparece desde Task 10: los MISMOS
 * `NAV_GROUPS` se entregan en la hoja de navegación móvil (`NavSheet.tsx`),
 * que es la otra cara de este bloque -- una sola fuente de verdad de destinos,
 * dos presentaciones excluyentes por CSS. SIN JavaScript esa otra cara no
 * existe (la hoja no abre nunca), así que desde la crítica externa #17 este
 * bloque también se enciende bajo `md`: ver el bloque `@media (scripting:
 * none)` del final, que es donde vive esa excepción y su medición. `<div>`, no
 * un segundo `<nav>`: `ScNav` ya es el elemento `nav` de la barra, y anidar un
 * landmark de navegación dentro de otro sería un `nav` redundante para
 * lectores de pantalla.
 *
 * EL BREAKPOINT NO SE MUEVE CON D2, y es una decisión medida, no inercia. La
 * pregunta que había que responder es si la composición nueva cabe donde cabía
 * la vieja; la respuesta se calcula sobre el ancho de texto, que es lo único
 * que cambia. En castellano la fila pasa de cuatro rótulos de grupo con
 * galón («En el sitio», «Descubre», «Recursos», «Comunidad» = 36 caracteres +
 * 4 chevrones) a cuatro destinos más «Más» (39 caracteres + 1 chevrón): tres
 * caracteres más (~21px a 14px de cuerpo) contra tres chevrones menos (~41px,
 * contando el galón de 0.6rem y su `gap` de `space[1]`), con un `gap` de fila
 * más (`space[5]`, 24px) por el ítem extra. Neto: unos pocos píxeles, en el
 * mismo orden de magnitud que hoy. En inglés la fila nueva es más ESTRECHA
 * («Story/Journey/Features/Contact/More» = 31 caracteres frente a los 33 de
 * los cuatro rótulos de grupo). Es decir: D2 no acerca ni aleja el punto en
 * que la barra se queda sin sitio, así que moverlo sería cambiar el
 * comportamiento de las tablets por una razón que este cambio no aporta.
 *
 * Y QUÉ PASA SI AUN ASÍ NO CABE en el extremo estrecho de la ventana
 * (768-1024px, no en 1024-1280, donde sobran ~200px por el mismo cálculo): la
 * válvula ya existe y está declarada -- `ScBrandLink` tiene `min-width: 0` +
 * `text-overflow: ellipsis` y `ScActions` tiene `flex: none`, así que lo que
 * cede es el rótulo de la marca y nunca los controles (ver el docblock de
 * `ScBrandLink`, que documenta ese reparto con la medición de la ola I a
 * 200% de tamaño de fuente). Este bloque NO declara `min-width: 0`: sus
 * enlaces no deben encogerse ni recortarse, porque un destino de navegación
 * con puntos suspensivos deja de nombrar su destino.
 *
 * Las dos cifras de arriba son ARITMÉTICA sobre anchos de carácter, no una
 * medición en navegador: jsdom no hace layout, así que ningún test de este
 * repo puede observarlas (regla 44/47). Quedan declaradas para que el
 * integrador las confirme a 768, 1024 y 1280px.
 *
 * Oculto por `display: none` bajo `md` (no desmontado): igual que el resto
 * del navbar, no cambia el orden de tabulación de forma condicional al
 * viewport.
 *
 * ## SIN JAVASCRIPT: SE OCULTA EL DISCLOSURE, NO EL BLOQUE (crítica externa
 * #11, hallazgo A, P1 -- y su corrección por D2)
 *
 * El hallazgo original, medido con `javaScriptEnabled: false` real: los cuatro
 * disparadores se seguían pintando con su galón, y al pulsarlos `aria-expanded`
 * no se movía de `"false"`, no se abría nada y nada lo explicaba. La apertura
 * es estado de React (`moreOpen`, y de ahí el `data-open`/`inert` de
 * `ScNavPanel`): sin JavaScript ese estado no cambia nunca, el panel se queda
 * para siempre en `visibility: hidden` + `inert` (los dos ya horneados en el
 * HTML exportado, que se genera con `isOpen === false`) y el disparador es una
 * promesa que no se puede cumplir. Mismo criterio y mismo precedente que
 * `ScSheetTriggerSlot` (`NavSheet.tsx`), `ScThemeToggleSlot`
 * (`ThemeToggle.tsx`) y `ScLanguageSelector` (`LanguageSelector.tsx`).
 *
 * EL GUARD BAJA A `ScNavGroup` CON D2, y el propio docblock anterior lo dejó
 * escrito: "si algún día este bloque gana un enlace PLANO (que sin JavaScript
 * sí funcionaría), el guard baja a `ScNavGroup` y este comentario deja de ser
 * cierto". Ese día es hoy: los cuatro destinos de sección son `<a href>`
 * planos que navegan perfectamente sin JavaScript, así que dejar el guard
 * sobre el contenedor los borraría junto con el disparador y regalaría la
 * navegación de escritorio a cambio de nada. Lo que se oculta sin JavaScript
 * es exactamente lo que no funciona sin él: el disclosure.
 *
 * NO DEJA A NADIE SIN SALIDA, que es lo que decide el caso: `Footer.tsx`
 * recorre el MISMO `NAV_GROUPS` y pinta cada destino como un `<a href>` plano,
 * siempre presente en el HTML exportado y sin ninguna capa que abrir. Los tres
 * grupos que se ocultan aquí (Descubre, Recursos, Comunidad) siguen enteros
 * en el pie.
 *
 * NO DEJA HUECO, verificado en fuente: `ScNavGroup` con `display: none` no es
 * ítem de flex, así que ni ocupa ni aporta `gap` -- la fila queda con los
 * cuatro enlaces y nada más, sin un ítem de anchura cero colgando al final.
 */
const ScNavLinks = styled.div`
  display: none;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.data.space[5]};
  }

  /*
   * SIN JAVASCRIPT LOS DESTINOS DE SECCIÓN SE VEN TAMBIÉN EN MÓVIL (crítica
   * externa #17, P1 del evaluador Nielsen, 2026-09-03).
   *
   * EL DEFECTO, reproducido con javaScriptEnabled: false real antes de
   * tocar nada (Chrome, build de producción servido, 390x844, tema claro): de
   * los 18 controles del header, DIECISIETE median 0x0 y solo sobrevivía el
   * logotipo. La página mide 10.201 px a ese ancho, así que un visitante móvil
   * sin JavaScript no tenía un solo enlace de navegación hasta el pie. A 1440
   * la misma medición daba 11 controles a 0x0 y siete vivos --marca, los
   * cuatro destinos y los dos idiomas--, es decir: la degradación suave ya
   * existía en escritorio y se caía entera al bajar de 768 px.
   *
   * LA CAUSA NO ERA TÉCNICA, ERA HEREDADA. La regla base display: none de
   * este bloque se escribió cuando el contenido eran cuatro DISPARADORES de
   * desplegable (estado de React) y la hoja móvil era su única alternativa.
   * Desde la decisión D2 (2026-09-02, crítica #14) los cuatro destinos son
   * <a href> a anclas ABSOLUTAS (/#story, /en#story) que navegan
   * perfectamente sin JavaScript: ocultarlos en móvil dejó de ser una
   * necesidad y pasó a ser inercia. Lo que sí sigue exigiendo JavaScript --el
   * disclosure «Más»-- ya se retira por su cuenta en ScNavGroup, así que
   * este bloque puede encenderse entero sin arrastrar ninguna promesa muerta.
   *
   * flex-wrap: wrap y no una fila fija: a 390 px los cuatro rótulos
   * castellanos ocupan unos 306 px de los 342 disponibles, así que caben --
   * pero en un teléfono más estrecho, con el idioma en inglés más largo o a
   * 200 % de tamaño de fuente, dejan de caber, y una fila que desborda no es
   * mejor que una fila oculta. ScNav aporta la otra mitad (envolver y
   * crecer, ver su propio bloque de scripting: none).
   *
   * CON JAVASCRIPT NO CAMBIA NADA, y el orden de los bloques es lo que lo
   * garantiza: este va DESPUÉS del de md y declara los mismos valores
   * (display: flex, align-items: center, el mismo gap), así que en
   * escritorio sin JavaScript la fila queda byte a byte como estaba salvo por
   * el flex-wrap, que no cambia nada mientras el contenido quepa. Con
   * JavaScript el bloque entero no se evalúa.
   */
  @media (scripting: none) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: ${({ theme }) => theme.data.space[5]};
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
 * LOS CUATRO DESTINOS DE SECCIÓN, VISIBLES EN LA PÍLDORA (decisión D2 del
 * dueño, 2026-09-02, crítica #14 -- ver el docblock de `navBarSectionsFor` en
 * `src/config/navigation.ts` para la medición que la motiva).
 *
 * Hereda de `ScNavLink` por composición, igual que `ScNavPanelLink`: mismo
 * `textMuted` en reposo, mismo `brandText` en hover/focus, mismo press de
 * `PRESS` y mismos guards de reduce, sin duplicar una sola declaración de
 * aquel bloque. Lo que añade es lo propio de un enlace que vive EN LA BARRA y
 * no en una columna desplegable:
 *
 * - `min-height: 44px` + `inline-flex`/`align-items: center`: el mismo suelo
 *   táctil AA que ya declaran `ScNavTrigger`, `ScBrandLink` y
 *   `ScLanguageButton` en esta misma fila, y muy por encima del mínimo de
 *   24x24 de WCAG 2.5.8. No cambia el aspecto (la banda mide
 *   `--nav-height`, 56px): solo agranda la caja de clic.
 * - El tratamiento de «ésta es la actual», heredado VERBATIM del que
 *   `ScNavTrigger` llevaba hasta esta entrega y que a su vez copiaba de
 *   `ScLanguageButton` `$active` (`LanguageSelector.tsx`, el idioma activo, a
 *   unos píxeles de aquí): `text-decoration: underline` +
 *   `text-underline-offset: 0.2em`, ni una declaración más.
 *
 * SE PINTA DESDE `aria-current`, NO DESDE UNA PROP: el selector es
 * `&[aria-current="location"]`, así que la marca visual y la semántica no
 * pueden divergir por construcción -- si el atributo no está, no hay
 * subrayado, y no hay ningún segundo estado que mantener sincronizado. Es la
 * misma técnica que ya usa `ScNavPanelLink::before` para su punto.
 *
 * POR QUÉ SUBRAYADO Y NO EL PUNTO DEL PANEL, que sería la otra reutilización
 * literal: el punto mide `space[2]` (8px) más el `gap` de su fila y OCUPA
 * SITIO en el flujo. En una columna vertical eso no cuesta nada; en esta fila
 * -- que comparte ancho con la marca, «Más», el idioma y el conmutador de
 * tema -- reservarle hueco a los cuatro enlaces ensancharía la píldora ~48px,
 * y pintarlo solo en el activo movería los otros tres cada vez que el lector
 * cambia de sección. El subrayado no participa del layout: no reflowea nada.
 */
const ScNavSectionLink = styled(ScNavLink)`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  /* Sin comillas invertidas dentro del template: regla 23 de RULES.md, ya ha
     roto el build tres veces. */
  text-underline-offset: 0.2em;

  &[aria-current="location"] {
    text-decoration: underline;
  }

  /*
   * EL DESTINO QUE SOLO CABE EN LA BARRA ANCHA (crítica externa #18, hallazgo
   * O-4; medición completa en el docblock de la partición, navigation.ts).
   * Sin comillas invertidas dentro del template: regla 23 de RULES.md.
   *
   * El atributo lo pone Navbar() a los items que devuelve
   * navBarWideSectionsFor -- derivados del modelo, no de una lista tecleada
   * --, y lo que decide aquí es SOLO desde qué ancho se pinta. La regla base
   * es la estrecha (display: none, el destino vive tras «Más», que es lo que
   * ocurre hoy en toda la franja md..lg) y se corrige hacia arriba,
   * mobile-first como el resto del fichero.
   *
   * LA CONSULTA ES DE CONTENEDOR, NO DE VENTANA, y no es un capricho: mide el
   * ancho de la barra Y responde al tamaño de fuente del usuario, de modo que
   * este enlace se retira solo cuando el texto crece (a 200 % de fuente la
   * fila no tiene sitio para él a ningún ancho hasta 1440 px, medido). El
   * porqué completo, con la tabla, vive en navbarContainer.ts.
   *
   * inline-flex, no flex ni initial: repite EXACTAMENTE el valor que declara
   * la regla base de este mismo componente unas líneas más arriba, que es lo
   * que le da su suelo táctil de 44px junto a align-items: center. Un
   * display: revert habría devuelto el inline del ancla y encogido la caja de
   * clic a la altura del texto.
   *
   * 62em (992 px con la raíz por defecto, o sea lg) NO es una cifra elegida a
   * ojo: a 900 px la fila tiene 146 px
   * de holgura total y este enlace pide 156 (132 de tinta más los 24 del gap
   * de la fila), así que el déficit se lo comería el rótulo de la marca --
   * que a 768 px ya se recorta hoy sin este enlace. A 992 px la holgura es
   * 238 px y sobran 82.
   */
  &[data-wide-only] {
    display: none;

    @container ${NAVBAR_WIDE_QUERY} {
      display: inline-flex;
    }
  }
`;

/*
 * Un grupo del menú desplegable: envoltorio con `position: relative` que
 * ancla su panel (`ScNavPanel`, `position: absolute; top: 100%`) al
 * disparador que lo abre. Es además el nodo donde `NavMoreMenu` escucha
 * `onKeyDown` (Escape, regla 3) y `onBlur` (foco que sale del grupo, regla
 * 5): React hace burbujear los dos eventos desde cualquier descendiente
 * -- el propio disparador o un enlace del panel --, así que se capturan
 * una sola vez aquí, nunca por separado en cada uno de los dos.
 */
const ScNavGroup = styled.div`
  position: relative;

  /* Sin JavaScript el desplegable no abre nunca y el pie ya expone la
     navegación completa: ver la sección "SIN JAVASCRIPT" del docblock de
     ScNavLinks, que explica por qué el guard vive aquí desde la decisión D2 y
     no sobre el contenedor -- los cuatro enlaces de sección que lo acompañan
     SÍ funcionan sin JavaScript y no se pueden ocultar con él. */
  @media (scripting: none) {
    display: none;
  }
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
 * SEÑAL DE SECCIÓN ACTUAL CON EL PANEL PLEGADO (`data-current`).
 *
 * Existió como prop `$current` (2026-08-20, ola post-crítica #13), se retiró
 * con la decisión D2 del dueño (2026-09-02, crítica #14) y vuelve aquí el
 * 2026-09-03 (crítica externa #17, P1 del verificador de navegador) porque el
 * argumento que la retiró era FALSO Y MEDIBLE COMO FALSO. Aquel docblock
 * afirmaba que «Más» agrupa `discover`/`resources`/`community` y que ninguno
 * de sus items es `kind: "section"`, así que la marca no podría encenderse
 * nunca. Pero `navigation.ts` declara `{ key: "about", href: "/#about",
 * kind: "section" }` dentro del grupo PARTIDO, y `navBarMoreGroupsFor` deja
 * aquí justamente el resto de esa partición -- su propio docblock lo dice:
 * «el grupo partido DESAPARECE si se queda sin items (hoy no ocurre: about
 * vive ahí)».
 *
 * El efecto medido de esa contradicción (Chrome real, 1440x900,
 * `reducedMotion: reduce`, tema fijado en `localStorage` antes de cargar, 3,5 s
 * de asentamiento, build de producción Y servidor de desarrollo, los dos
 * temas): con `#about` como sección activa el ÚNICO
 * `aria-current="location"` del documento cuelga de un enlace de 169x23 con
 * `visibility: hidden` dentro del panel plegado, y el disparador visible
 * computa exactamente lo mismo que cuando la activa es Story
 * (`color` `oklch(0.5 0 286)` en claro / `oklch(0.86 0.004 286)` en oscuro,
 * `font-weight: 500`, `text-decoration-line: none`). Es decir: la barra no
 * marcaba NADA para una de las cinco secciones de la home.
 *
 * Lo que se restaura es la mitad VISIBLE, y solo eso: el mismo tratamiento
 * que `ScNavSectionLink` da a la suya (`text-decoration: underline` +
 * `text-underline-offset: 0.2em`, ni una declaración más), porque las dos
 * responden a la misma pregunta del lector y no deben hablar dos idiomas. No
 * hay doble marca posible: si la sección activa vive en un enlace visible de
 * la píldora, no vive detrás de este disparador.
 *
 * SE PINTA DESDE `data-current`, NO DESDE UNA PROP transitoria, por el mismo
 * motivo que `ScNavSectionLink` se pinta desde `aria-current`: el estado queda
 * en el DOM, se puede aseverar desde un test sin inspeccionar hojas de estilo
 * y no hay un segundo estado que mantener sincronizado. El atributo lo decide
 * `NavMoreMenu` recorriendo sus grupos por `kind === "section"` (dato, no
 * lista escrita a mano), así que sigue siendo correcto el día que la
 * partición de `NAV_GROUPS` cambie.
 *
 * LO QUE SIGUE PENDIENTE, y no se resuelve aquí: el panel plegado es `inert`,
 * así que ese `aria-current` tampoco llega al árbol de accesibilidad -- un
 * usuario de lector de pantalla sigue sin oír «estás en Qué es
 * VoidToInfinite». Cerrarlo exige o bien un texto oculto nuevo en el
 * disparador (cadena de i18n en los dos idiomas, y el nombre accesible pasa a
 * depender de la sección leída), o bien sacar `about` a la píldora como quinto
 * enlace visible. Las dos son decisiones del dueño sobre la barra, no algo
 * que se resuelva en silencio desde este bloque de CSS.
 */
const ScNavTrigger = styled.button`
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

  /* La sección que se está leyendo vive detrás de este disparador: ver el
     docblock de arriba. Mismas dos declaraciones que ScNavSectionLink, sin
     comillas invertidas dentro del template (regla 23 de RULES.md). */
  &[data-current="true"],
  &[data-current="wide"] {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  /*
   * EL VALOR wide ES «detrás de mí, pero solo mientras la barra sea
   * estrecha» (crítica externa #18, hallazgo O-4; sin comillas invertidas
   * dentro del template, regla 23 de RULES.md). Lo emite NavMoreMenu cuando
   * la sección que se está leyendo vive en un grupo que la barra ancha se
   * lleva fuera de aquí: por debajo de lg la marca es correcta (el destino
   * está de verdad detrás de este botón), y desde lg sería una
   * segunda marca compitiendo con el subrayado del enlace ya visible en la
   * fila -- dos «estás aquí» a la vez, que es peor que ninguno.
   *
   * Va DESPUÉS del bloque de arriba y a la misma especificidad, así que gana
   * el último dentro de su media query, y solo para ese valor.
   */
  @container ${NAVBAR_WIDE_QUERY} {
    &[data-current="wide"] {
      text-decoration: none;
    }
  }

  &:active {
    transform: scale(${PRESS.activeScale});
  }

  /* Forma de boton bajo colores forzados (critica externa #16, hallazgo L12,
     2026-09-03). Medido con forced-colors: active sobre la barra real: este
     disparador computaba border-top-width: 0px y border-top-style: none
     mientras sus dos vecinos de la misma fila -- el conmutador de tema y la
     hamburguesa, los dos IconButton y por tanto styled(Button) -- computaban
     1px solid. La diferencia no era una omision de estilo sino estructural:
     este control es un styled.button propio con border: none (dos lineas mas
     arriba, parte del reseteo de la apariencia nativa), asi que ninguna
     cascada le traia la regla de Button. En modo de colores forzados el
     navegador tira el color de fondo de autor, asi que sin borde el unico
     boton de solo texto de la barra se leia como un enlace mas.

     Se interpola el MISMO fragmento que consume ScButton, nunca una copia del
     literal (ver el docblock de forcedColorsButtonShape): la regla que pinta
     el borde de los tres controles de esta fila es una sola.

     Va DESPUES del border: none de arriba a proposito -- misma especificidad,
     gana el ultimo -- y dentro de su media query no mueve nada en los dos
     temas normales. Los enlaces de idioma no entran: son anclas, y un ancla no
     promete forma de boton en ningun modo. (Sin comillas invertidas: regla 23
     de RULES.md.) */
  ${forcedColorsButtonShape}

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
 * Task 9 (craft de interacción, punto 5 del brief): el panel cuelga desde la
 * esquina superior de su disparador, así que ahí se ancla el
 * `transform-origin` -- `top right` desde la decisión D2 (ver el bloque justo
 * encima de la declaración, que explica el cambio de anclaje), `top left`
 * hasta entonces; nunca el centro por defecto, o el panel "flotaría" hacia el
 * centro de su propia caja al cerrarse. El estado cerrado suma
 * `scale(OVERLAY.closedScale)` al `translateY` que ya tenía.
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
/*
 * ANCLADO A LA DERECHA DESDE LA DECISIÓN D2 (2026-09-02), antes a la
 * izquierda. No es cosmético: con cuatro disparadores repartidos por la fila,
 * `left: 0` hacía que cada panel creciera hacia la derecha desde SU
 * disparador, y el más a la derecha («Comunidad») era el único que se acercaba
 * al filo. Ahora queda UN solo disclosure, y es el ÚLTIMO elemento del bloque
 * de enlaces: es decir, el más cercano al grupo de acciones (idioma + tema) y
 * al borde de la píldora. Con `left: 0` un panel de `min-width: 12rem` --
 * ahora además con tres grupos rotulados dentro, así que más ancho que antes
 * -- crecería justo hacia ese borde. `right: 0` lo hace crecer hacia el
 * interior de la barra, donde el espacio libre está por construcción.
 *
 * `transform-origin` acompaña al anclaje (`top right`, antes `top left`): el
 * encogimiento de `scale` tiene que anclarse en la esquina de la que el panel
 * cuelga, o al cerrarse el panel "flotaría" hacia el centro de su propia caja
 * en vez de replegarse contra su disparador.
 */
const ScNavPanel = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
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

  transform-origin: top right;
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

/*
 * Los tres grupos DENTRO del único panel (decisión D2): hasta esta entrega
 * cada grupo tenía su propio disparador y su propio panel, así que el rótulo
 * del grupo ERA la etiqueta del botón. Con un solo disclosure («Más») esa
 * etiqueta ya no puede nombrar tres cosas a la vez, y los rótulos bajan
 * dentro del panel -- que es exactamente lo que la hoja móvil lleva haciendo
 * desde la Task 10, y lo que la crítica #14 señala como la razón de que
 * resuelva mejor el problema en una pantalla mucho más pequeña.
 *
 * Mismo par de piezas y misma semántica que `ScSheetGroup`/`ScSheetGroupTitle`
 * (`NavSheet.tsx`) y que `ScColumnTitle` (`Footer.tsx`): el rótulo es un `<p>`
 * atado a su lista con `aria-labelledby`, NUNCA un `h*`. Convertirlo en
 * encabezado metería en el esquema del documento tres títulos que solo
 * existen dentro de un desplegable de escritorio; `aria-labelledby` es la
 * herramienta correcta para nombrar una lista, y ya hay un candado en la
 * suite que afirma que la hoja no introduce encabezados por el mismo motivo.
 */
const ScNavPanelGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.data.space[1]};

  & + & {
    margin-top: ${({ theme }) => theme.data.space[3]};
  }

  /*
   * LA OTRA MITAD DEL RÉGIMEN ANCHO (crítica externa #18, hallazgo O-4).
   *
   * Sin comillas invertidas dentro del template: regla 23 de RULES.md.
   *
   * Desde lg la barra pinta como enlace visible el resto del grupo partido
   * (ver el bloque data-wide-only de ScNavSectionLink), así que ya no tiene
   * nada que aportar aquí dentro: sin esta regla, «Más» ofrecería a partir de
   * 992 px un rótulo («En el sitio») con el MISMO destino que se está leyendo
   * a dos centímetros, en la propia barra.
   *
   * Se oculta el GRUPO entero y no sus items uno a uno, y no es lo mismo:
   * esconder solo los enlaces dejaría el rótulo del grupo suelto sobre una
   * lista vacía. El atributo lo pone NavMoreMenu solo cuando TODOS los items
   * del grupo se mudan a la barra ancha -- si algún día queda uno que no se
   * muda, el grupo sigue aquí con él, sin que nadie tenga que acordarse.
   */
  &[data-wide-only] {
    @container ${NAVBAR_WIDE_QUERY} {
      display: none;
    }
  }
`;

const ScNavPanelGroupTitle = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.data.space[1]}
    ${({ theme }) => theme.data.space[2]};
  font-size: ${({ theme }) => theme.data.type.scale.caption.size};
  font-weight: 600;
  color: ${({ theme }) => theme.data.semantic.textSubtle};
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
 * `NavMoreMenu`, más abajo), así que el `::before` de los demás items
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
 * EL ÚNICO DESPLEGABLE DE LA BARRA (decisión D2, 2026-09-02): «Más», que
 * agrupa `discover` + `resources` + `community` con sus rótulos dentro.
 *
 * Hasta esta entrega esto era `NavGroupMenu`, y `Navbar()` montaba CUATRO
 * instancias -- una por grupo de `NAV_GROUPS`, cada una con su disparador y su
 * panel. La crítica #14 midió el resultado a 1440x900: cuatro botones cuyas
 * etiquetas no nombran ningún destino, uno de ellos abriendo un panel entero
 * para revelar un solo enlace, y ni un enlace de navegación visible en la
 * barra. D2 saca los cuatro destinos de sección a la píldora (ver
 * `ScNavSectionLink`) y deja UN disclosure para el resto.
 *
 * Vive fuera de `Navbar()` por lo mismo que su antecesor: necesita su propio
 * `useId()` (disparador + panel, para que `aria-controls`/`aria-labelledby`
 * apunten a ids reales) y su propia referencia al disparador, para devolverle
 * el foco al cerrar con Escape.
 *
 * RECIBE `activeSectionKey` y lo usa en dos sitios, no en uno: el
 * `aria-current` de cada enlace del panel (dato-dirigido por
 * `kind === "section"`, más abajo) y el `data-current` del disparador, que es
 * la única marca VISIBLE cuando la sección activa vive detrás del plegado.
 * Ese segundo uso no es hipotético: el grupo partido que `navBarMoreGroupsFor`
 * deposita aquí conserva `about`, que es `kind: "section"` -- ver el docblock
 * de `ScNavTrigger` para la medición que lo demuestra y para lo que sigue
 * pendiente del dueño. Las dos resoluciones leen el MISMO `kind`, así que
 * describen cualquier partición futura de `NAV_GROUPS` en vez de la de hoy.
 */
interface NavMoreMenuProps {
  /** Los grupos que quedan detrás del disclosure (`navBarMoreGroupsFor`). */
  readonly groups: readonly NavGroup[];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
  /** `key` de la sección actualmente visible (`useActiveSectionKey`), o
   *  `null` si ninguna lo está. Solo los items `kind: "section"` lo
   *  consumen: su `aria-current` (más abajo) y, cuando alguno de ellos es el
   *  activo, el `data-current` del disparador. */
  readonly activeSectionKey: string | null;
  /** Destinos que la barra ANCHA pinta como enlaces visibles
   *  (`navBarWideSectionsFor`) y que, por tanto, sobran de este panel desde
   *  `lg`. Llega el MISMO array memoizado que `Navbar()` ya pinta en la fila
   *  -- aquí no se vuelve a derivar nada, ni se teclea ninguna clave, ni se
   *  fabrica una lista nueva en cada render de scroll. */
  readonly wideOnlySections: readonly NavItem[];
}

function NavMoreMenu({
  groups,
  isOpen,
  onToggle,
  onClose,
  activeSectionKey,
  wideOnlySections,
}: NavMoreMenuProps): ReactElement {
  const { t } = useTranslation("common");
  const triggerId = useId();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* ¿La sección que se está leyendo vive detrás de este disparador? Se
     resuelve del MISMO dato que el aria-current de cada enlace del panel
     (kind === "section"), nunca de una lista de claves escrita a mano: ver el
     docblock de ScNavTrigger. Sin memoizar a propósito -- son tres grupos con
     un puñado de items, y el propio render ya los recorre entero unas líneas
     más abajo. */
  const holdsActiveSection =
    activeSectionKey !== null &&
    groups.some((group) =>
      group.items.some(
        (item) => item.kind === "section" && item.key === activeSectionKey,
      ),
    );

  /* ¿Y esa sección es de las que la barra ANCHA se lleva fuera de aquí? El
     disparador la marca igual (por debajo de `lg` sigue estando detrás de él),
     pero con un valor distinto, para que el CSS pueda retirar la marca justo
     donde el enlace ya se ve en la fila -- ver el bloque `data-current` de
     ScNavTrigger. Derivado de la misma lista que pinta la barra, no de una
     condición sobre `about`. */
  const activeSectionIsWideOnly =
    activeSectionKey !== null &&
    wideOnlySections.some((item) => item.key === activeSectionKey);

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
        aria-expanded={isOpen}
        aria-controls={panelId}
        /* Marca VISIBLE de "la sección que lees está aquí dentro". No lleva
           aria-current: este botón no es la ubicación, es lo que la esconde --
           el atributo semántico se queda en el enlace que sí lo es, dentro del
           panel. Ausente (no "false") cuando no aplica, para que el selector
           de CSS y las aserciones lean lo mismo. */
        data-current={
          holdsActiveSection
            ? activeSectionIsWideOnly
              ? "wide"
              : "true"
            : undefined
        }
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
        {t("Common.Nav.more")}
        {/* «Más» a secas es un rótulo de contenedor: dice que hay algo detrás,
            no de qué. Se completa para lectores de pantalla con un texto
            oculto que NO sustituye la etiqueta visible sino que la extiende
            («Más destinos del sitio»), así que el nombre accesible sigue
            EMPEZANDO por lo que se lee en pantalla -- WCAG 2.5.3, Label in
            Name, que un `aria-label` con otro texto habría roto.

            Espacio literal DENTRO del texto oculto, no entre nodos JSX (que
            la compilación colapsaría): mismo criterio y mismo motivo que ya
            documenta el aviso de pestaña nueva, unas líneas más abajo. */}
        <VisuallyHidden> {t("Common.Nav.moreHint")}</VisuallyHidden>
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
        {groups.map((group) => {
          /* Id DERIVADO del `useId()` del panel, no un `useId()` propio: los
             grupos se recorren en un `map`, y un hook no se puede llamar
             dentro de un bucle. La alternativa sería extraer un componente
             hijo solo para tener su propio `useId` (el camino que sí siguió
             `NavSheetGroup`, que además tiene su propio `switch` de
             etiquetas); aquí el sufijo basta y es estable: `panelId` es único
             por instancia y `group.key` es único dentro del modelo, así que
             el par no puede colisionar ni entre grupos ni entre barras. */
          const groupTitleId = `${panelId}-${group.key}`;
          /* El grupo entero se muda a la barra desde `lg`: TODOS sus items
             están entre los que la fila ancha pinta como enlaces visibles. Se
             calcula sobre el grupo, no sobre `about`, para que un grupo con
             un item que no se muda siga apareciendo aquí (ver el bloque
             `data-wide-only` de ScNavPanelGroup). `every` sobre una lista
             vacía sería `true`, pero `navBarMoreGroupsFor` ya descarta los
             grupos sin items antes de llegar aquí. */
          const groupIsWideOnly = group.items.every((item) =>
            wideOnlySections.some((wide) => wide.key === item.key),
          );

          return (
            <ScNavPanelGroup
              key={group.key}
              data-wide-only={groupIsWideOnly || undefined}
            >
              <ScNavPanelGroupTitle id={groupTitleId}>
                {t(`Common.Nav.${group.key}`)}
              </ScNavPanelGroupTitle>
              <ScNavPanelList aria-labelledby={groupTitleId}>
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
                        {/* Espacio literal DENTRO del texto oculto, no entre
                            nodos JSX (que la compilación colapsaría): sin él,
                            el `textContent` del ancla queda pegado ("VTI -
                            SDKse abre en...") y un lector de pantalla que lo
                            lea como una sola cadena pronuncia una palabra
                            inexistente. Mismo criterio ya aplicado en
                            `Footer.tsx` para este mismo aviso. */}
                        <VisuallyHidden>
                          {" "}
                          {t("Common.Nav.newTab")}
                        </VisuallyHidden>
                      </ScNavPanelLink>
                    </li>
                  ) : (
                    <li key={item.key}>
                      <ScNavPanelLink
                        href={item.href}
                        onClick={() => handleLinkActivate(item)}
                        /*
                         * Punto 1 del brief (Tarea 1): solo los items
                         * `kind: "section"` representan una sección real de
                         * la home -- "discover" apunta dentro de Features
                         * pero son títulos de contenido
                         * (Learning/Imagination/Gaming), no destinos de
                         * scrollspy propios. `"location"`, no `"true"`:
                         * WAI-ARIA reserva ese valor para "la posición
                         * actual dentro de un documento o contexto que el
                         * usuario está recorriendo".
                         *
                         * La decisión D2 sacó a la barra los cuatro
                         * destinos que ya estaban aquí
                         * (`ScNavSectionLink`), pero NO dejó este panel sin
                         * secciones: `about` es `kind: "section"` y vive en
                         * el resto del grupo partido, así que esta rama sí
                         * se enciende -- y hasta el 2026-09-03 era la única
                         * marca que existía para esa sección, sobre un
                         * enlace que el plegado deja en
                         * `visibility: hidden`. La mitad visible la pone
                         * ahora `data-current` en el disparador (ver el
                         * docblock de `ScNavTrigger`); esta condición sigue
                         * describiendo el MODELO (`kind`), no la partición
                         * concreta de hoy.
                         */
                        aria-current={
                          item.kind === "section" &&
                          item.key === activeSectionKey
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
            </ScNavPanelGroup>
          );
        })}
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
   *
   * Las dos vistas que consume la barra desde la decisión D2 salen de la MISMA
   * derivación por idioma (`navBarSectionsFor`/`navBarMoreGroupsFor` la
   * envuelven, ver `navigation.ts`): los cuatro destinos de sección que se
   * pintan visibles, y los tres grupos que quedan tras «Más».
   */
  const { t, i18n } = useTranslation("common");
  const barSections = navBarSectionsFor(i18n.language);
  /* Los destinos de sección que el modelo declara y que la barra estrecha no
     puede pintar: se montan SIEMPRE en el DOM y es el CSS quien los enciende
     desde `lg` (crítica externa #18, hallazgo O-4). No se decide aquí con una
     media query en JavaScript a propósito: bajo `output: "export"` el HTML se
     hornea sin saber el ancho de la ventana, y medir el viewport en el primer
     render produciría un árbol distinto del horneado. */
  const barWideSections = navBarWideSectionsFor(i18n.language);
  const moreGroups = navBarMoreGroupsFor(i18n.language);
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
  // sola vez, y se reparte al desplegable y a la hoja -- ninguno vuelve a
  // suscribirse por su cuenta.
  const activeSectionKey = useActiveSectionKey();

  /*
   * Un solo desplegable en la barra desde la decisión D2, así que su apertura
   * es un booleano. Aquí vivió `openGroup: NavGroupKey | null`, y ese tipo
   * existía para cumplir por construcción las reglas 1 y 2 de la tarea W4 (un
   * solo grupo abierto a la vez; abrir un segundo cierra el primero) cuando
   * había CUATRO disparadores. Con uno, esas dos reglas no describen ninguna
   * situación posible: no hay un segundo grupo que cerrar. Conservar la unión
   * sería conservar la coordinación de un problema que ya no existe.
   */
  const [moreOpen, setMoreOpen] = useState(false);
  const navLinksRef = useRef<HTMLDivElement>(null);

  /*
   * Hoja de navegación móvil (Task 10). El estado vive AQUÍ, y no dentro de
   * la propia hoja, porque sus dos piezas no tienen ancestro común: el
   * disparador va dentro de la barra y la hoja tiene que salir de
   * `ScHeader` para que su `position: fixed` se resuelva contra el viewport
   * y no contra la barra (`ScHeader` declara `transform`, y un ancestro con
   * `transform` se convierte en el bloque contenedor de los `fixed` de su
   * interior). Mismo reparto que `NavMoreMenu`, que también recibe su
   * estado desde aquí.
   */
  const sheet = useNavSheet();

  const closeMore = useCallback((): void => {
    setMoreOpen(false);
  }, []);

  const toggleMore = useCallback((): void => {
    setMoreOpen((current) => !current);
  }, []);

  /*
   * Regla 4: un click/pointerdown fuera del BLOQUE DE NAVEGACIÓN completo
   * -- no solo fuera del desplegable: los cuatro enlaces de sección son
   * parte del mismo bloque y pulsarlos no debe cerrar por esta vía, ya lo
   * hace su propio manejador -- cierra el desplegable abierto. Se escucha en
   * `document` porque el click puede caer en cualquier parte de la página
   * -- desde el resto de `ScHeader` hasta el fondo de una sección --, y SOLO
   * mientras esté abierto: cerrado no hay nada que cerrar ni listener que
   * mantener vivo, y el propio `return` de limpieza (regla 7) lo retira en
   * cuanto `moreOpen` cambia o el componente se desmonta.
   */
  useEffect(() => {
    if (!moreOpen) return;

    function handlePointerDown(event: PointerEvent): void {
      if (!(event.target instanceof Node)) return;
      if (navLinksRef.current?.contains(event.target)) return;
      setMoreOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [moreOpen]);

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
          {/* El landmark de navegación del sitio se ROTULA desde la ola M
              (2026-09-03): hasta entonces era el único `nav` del árbol en la
              home y no hacía falta distinguirlo, pero desde que las páginas
              legales montan esta misma barra conviven dos -- ésta y el índice
              del documento, que ya se llama «Índice» -- y una lista de
              landmarks con uno sin nombre no dice cuál es cuál. Medido en el
              árbol de accesibilidad de Chrome sobre /privacidad. */}
          <ScNav aria-label={t("Common.Nav.landmark")}>
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
              {/* Los cuatro destinos de sección, VISIBLES (decisión D2). El
                `onClick` es el mismo par que ya usaban dentro del panel menos
                el cierre, que aquí no aplica porque no hay panel que cerrar:
                mover el foco al destino del ancla (crítica externa #8, punto
                3, ver `navAnchorFocus.ts`). */}
              {barSections.map((item) => (
                <ScNavSectionLink
                  key={item.key}
                  href={item.href}
                  onClick={() => focusNavAnchorTarget(item)}
                  /* Mismo valor y mismo criterio que llevaban dentro del
                     panel: "location" (la posición actual dentro del
                     documento que el usuario recorre), y `undefined` --no
                     "false"-- cuando no lo es, para que el atributo
                     desaparezca del DOM en vez de anunciarse en los cuatro.
                     Lo que cambia con D2 es dónde se ve: el scrollspy ya no
                     exige abrir nada para percibirse. */
                  aria-current={
                    item.key === activeSectionKey ? "location" : undefined
                  }
                >
                  {t(`Common.Navigation.${item.key}`)}
                </ScNavSectionLink>
              ))}
              {/* Los destinos que solo caben en la barra ANCHA (crítica
                externa #18, hallazgo O-4). Mismo componente, mismo `onClick` y
                mismo `aria-current` que los de arriba -- no son enlaces de
                otra clase, son los mismos destinos de sección con un ancho
                mínimo para pintarse --, y el único añadido es el
                `data-wide-only` que su CSS lee para encenderse desde `lg`. Van
                DESPUÉS de los cuatro fijos y antes de «Más», que es su sitio
                en el orden del grupo (el orden de la página) y el sitio donde
                el visitante ya espera encontrar lo que venía de «Más». El
                rótulo sale de la MISMA clave que el pie y la hoja
                (`Common.Navigation.<key>`): un rótulo propio para la barra
                sería un segundo nombre para el mismo destino, y la medición
                dice que el completo cabe con 82 px de sobra a 992 px. */}
              {barWideSections.map((item) => (
                <ScNavSectionLink
                  key={item.key}
                  href={item.href}
                  data-wide-only
                  onClick={() => focusNavAnchorTarget(item)}
                  aria-current={
                    item.key === activeSectionKey ? "location" : undefined
                  }
                >
                  {t(`Common.Navigation.${item.key}`)}
                </ScNavSectionLink>
              ))}
              <NavMoreMenu
                groups={moreGroups}
                isOpen={moreOpen}
                onToggle={toggleMore}
                onClose={closeMore}
                activeSectionKey={activeSectionKey}
                wideOnlySections={barWideSections}
              />
            </ScNavLinks>
            <ScActions>
              {/* `data-bar-language`: gancho de test del guard sin JavaScript
                (crítica externa #17). Mismo criterio que `data-nav-links` y
                `data-nav-surface` de arriba: un `data-*` sobre un elemento del
                DOM no obliga a declarar nada en la interfaz de props de nadie,
                y jsdom no evalúa ningún `@media`, así que la única forma
                honesta de afirmar algo sobre este bloque es localizar su clase
                inyectada y leer la regla del CSSOM. */}
              <ScBarLanguage data-bar-language>
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
