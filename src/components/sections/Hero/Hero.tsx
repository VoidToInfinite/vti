"use client";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import styled, { css, keyframes } from "styled-components";
import { EYE_SURFACE } from "@/components/scenes/eye/eye.layers";
import {
  BrandName,
  gradientShift,
  heroGradient,
} from "@/components/layout/Brand/BrandName";
import { Button } from "@/components/ui/Button/Button";
import { Typography } from "@/components/ui/Typography/Typography";
import { useStage } from "@/motion/StageProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { HeroBackdrop } from "./HeroBackdrop";
import {
  HERO_COPY_IN_MS,
  HERO_COPY_OUT_MS,
  HERO_FADE_MS,
  useHeroCopySwap,
} from "./hero.transition";

/*
 * La superficie del hero YA sigue el tema de la pagina: en oscuro monta el
 * ojo cosmico (composicion negra, sin cambios); en claro monta Aura, el
 * fondo pastel (spec S6). Hasta esta entrega el hero anidaba un
 * `ThemeProvider` con el tema oscuro forzado -- tenia sentido cuando el
 * lienzo era negro en los DOS temas, pero era la fuente exacta del bug de
 * `task/lessons.md` sobre `currentColor` heredando del `ThemeProvider`
 * AMBIENTAL en vez del contextual: dos arboles de tema que solo coincidian
 * en tres de cuatro combinaciones. Sin ese proveedor anidado hay un arbol de
 * tema menos que pueda divergir, y `theme.data.semantic.*` resuelve aqui al
 * mismo tema que el resto de la pagina, tal como pintan Aura/HeroBackdrop.
 *
 * La distribucion (`$light`, mas abajo) usa `layoutTheme` de
 * `useHeroCopySwap`, NO el tema activo directamente: la copia no puede
 * saltar de sitio en el mismo instante en que el fondo todavia es el del
 * tema anterior (ver el hook para el porque completo).
 */
const ScHero = styled.section<{ $light: boolean }>`
  position: relative;
  /* Una pantalla exacta: el navbar es fixed, esta fuera de flujo, asi que el
     hero empieza en el borde superior y la composicion queda centrada en el
     viewport en vez de descolgada por debajo del pliegue. */
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.data.space[5]};
  padding: ${({ theme }) => theme.data.space[6]}
    ${({ theme }) => theme.data.space[5]} ${({ theme }) => theme.data.space[8]};
  overflow: hidden;

  /* La columna partida es una mejora de ESCRITORIO (spec S6.5): por debajo
     de este punto de corte el tema claro vuelve a la distribucion centrada,
     igual que el oscuro. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${({ $light }) =>
      $light &&
      css`
        justify-content: center;
        align-items: flex-start;
      `}
  }
`;

/*
 * El velo de contraste YA NO VIVE AQUI. Existe para que la copia se lea sobre
 * la corona del ojo, asi que su motivo es del hero -- pero su ciclo de vida es
 * el de la composicion oscura, y eso es lo que decide donde va. Montado aqui y
 * condicionado al tema, aparecia y desaparecia de golpe en t=0, cuando el
 * stack contrario todavia esta cruzando: al pasar a oscuro pintaba un velo
 * negro sobre el pastel aun visible, medio segundo antes de que hubiera
 * ninguna corona que apagar. Ahora es hijo de `ScSocket` (ver `ScScrim` en
 * `eye.parts.tsx`) y lo arrastra el fundido del propio stack. Mismo
 * razonamiento por el que la rampa violeta del pie claro vive dentro de Aura.
 */

/*
 * Pie del hero. Garantiza que la ULTIMA fila de pixeles del hero sea el negro
 * del lienzo en cualquier relacion de aspecto, EN TEMA OSCURO. ScFrame
 * mantiene la relacion 1672/941 centrada: en viewports mas apaisados que
 * 16:9 (un portatil de 1440x720, una ultrapanoramica) el marco desborda en
 * vertical y la fila inferior es campo de nebulosa. Sin este pie, el extremo
 * superior de la costura de Story no coincidiria con lo que hay encima justo
 * ahi, y el tajo entre secciones reaparece. Con 4rem el coste decorativo es
 * minimo y en la mayoria de viewports el degradado cae sobre negro, donde es
 * invisible.
 *
 * Ni la altura ni el degradado cambian con el tema (spec S6.4): la rampa
 * violeta del tema claro es una pieza DISTINTA (ScAuraFoot, dentro del stack
 * de Aura), porque height/background-image no se pueden interpolar y saltar
 * de golpe en t=0 (con el fondo todavia en el tema anterior) dejaria un velo
 * ajeno sobre el lienzo equivocado. Este pie SOLO se apaga por opacidad en
 * claro, con la MISMA duracion que el cruce de fondos (HERO_FADE_MS): asi
 * desaparece a la vez que el ojo se funde por debajo.
 *
 * EYE_SURFACE es el negro de identidad importado de la capa de datos del ojo,
 * no un literal reescrito: dos literales iguales en dos archivos distintos se
 * separan al primer retoque y la costura reaparece. Misma excepcion de color
 * sancionada que documenta eye.parts.tsx.
 */
const ScHeroFoot = styled.div<{ $light: boolean }>`
  position: absolute;
  inset-inline: 0;
  inset-block-end: 0;
  height: ${({ theme }) => theme.data.space[8]};
  z-index: ${({ theme }) => theme.data.zIndex.base};
  pointer-events: none;
  background-image: linear-gradient(
    to bottom,
    oklch(0 0 0 / 0) 0%,
    ${EYE_SURFACE} 100%
  );

  ${({ $light }) =>
    $light &&
    css`
      opacity: 0;
      transition: opacity ${HERO_FADE_MS}ms
        ${({ theme }) => theme.data.motion.easing.decelerate};

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `}

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Los
 * CUATRO hijos (titulo -- la marca dentro de ScHeroBrand --, subtitulo,
 * apoyo, acciones) entran con un
 * paso de 80ms, no de 120ms: con 120ms el CTA aparecia a 680ms desde el
 * primer pintado; con 80ms entra a 520ms y la secuencia se sigue
 * percibiendo como secuencia. Solo transform/opacity.
 *
 * Distribucion por tema (spec S6.5), con `$light` (NO el tema activo
 * directamente: viene de `layoutTheme`, ver Hero()). El cruce entre las dos
 * distribuciones es por OPACIDAD (`$hidden`), nunca interpolando
 * `text-align`/`align-items`: esas dos provocan un re-wrap que no se puede
 * animar. `$hidden` llega ya resuelto por `useHeroCopySwap`, que solo lo
 * activa en cambios de USUARIO y aplica `$light` mientras la copia sigue
 * invisible -- por eso este componente no necesita saber nada de esa
 * mecanica, solo pintar lo que le llega.
 *
 * ARRANQUE DEL INTRO (tarea C5, spec §7.4): el escalonado de 80ms de los
 * CUATRO hijos NO cambia, pero deja de arrancar en cuanto el bloque se monta
 * -- ahora espera a la fase de PAGINA "chrome" (`useStage()`, ver `Hero()`),
 * leida en el atributo `data-intro` de ESTE MISMO elemento (selector
 * CALIFICADO `&[data-intro="in"]`, no descendiente: el atributo vive aqui,
 * no en un ancestro). La forma mas limpia de retrasar los retardos ya
 * calibrados sin recalcular ninguno es no montar la animacion hasta
 * entonces: en "pending" los hijos quedan a opacity 0 por regla ESTATICA
 * (sin animation alguna en marcha); en "in", la regla de animacion se
 * aplica por primera vez y su cuenta de animation-delay arranca EN ESE
 * INSTANTE -- igual que el escalonado del ojo/Aura conmuta su [data-state]
 * (spec §6.2): una animacion CSS reinicia su reloj cuando animation-name
 * pasa de ausente a declarado, no cuando el elemento se monta.
 *
 * CONVIVENCIA con la transition de opacity que ScCopy YA declara para
 * $hidden (mas abajo): son dos canales de opacidad en elementos DISTINTOS
 * -- $hidden anima la opacidad de ESTE contenedor (el cruce de tema
 * completo), mientras que data-intro controla la opacidad de sus HIJOS
 * DIRECTOS (> *). No hay ninguna propiedad compartida en el MISMO elemento
 * que pueda pisarse: la opacidad efectiva de un hijo es el PRODUCTO visual
 * de las dos (un hijo a opacity 1 sigue invisible si su padre esta en
 * opacity 0), nunca una sobreescritura de la misma regla. Y en la practica
 * no llegan a solaparse en el tiempo: data-intro solo pasa de "pending" a
 * "in" UNA VEZ en toda la vida de la pagina (la fase de StageProvider no
 * vuelve atras, spec §7.1), en la carga inicial -- momento en el que
 * $hidden todavia es false (la copia no se oculta hasta el PRIMER cambio de
 * tema de usuario, muy posterior). Los cambios de tema que vengan despues
 * solo mueven $hidden; los hijos ya estan en "in" para siempre y no vuelven
 * a tocar su animation.
 */
const ScCopy = styled.div<{ $light: boolean; $hidden: boolean }>`
  position: relative;
  z-index: ${({ theme }) => theme.data.zIndex.raised};
  display: flex;
  flex-direction: column;
  align-items: center;
  /* space[0] es el token de cero: el gap UNIFORME es exactamente lo que
     aplanaba el bloque (los cuatro escalones separados por la misma
     distancia). El ritmo lo da ahora cada pieza con su margin-block-start
     logico, proporcional a la distancia semantica del par que separa. */
  gap: ${({ theme }) => theme.data.space[0]};
  max-width: 70ch;
  text-align: center;
  /* Segunda linea de defensa del contraste, ADEMAS del velo, SOLO en
     oscuro: los parrafos son mas anchos que la pupila y sus extremos caen
     sobre la corona, que es la zona mas brillante y la mas irregular
     (filamentos finos, no un tono plano). Una sombra pegada al glifo
     garantiza el borde oscuro justo donde hace falta sin apagar la
     ilustracion entera. En claro NO hace falta (spec S6.5): el texto oscuro
     sobre el pastel ya pasa AA medido (Hero.qa.test.tsx), y una sombra
     oscura sobre un fondo claro solo ensuciaria la lectura. */
  text-shadow: ${({ $light }) =>
    $light
      ? "none"
      : "0 1px 2px oklch(0 0 0 / 0.9), 0 0 18px oklch(0 0 0 / 0.75)"};
  opacity: ${({ $hidden }) => ($hidden ? 0 : 1)};
  transition: opacity
    ${({ $hidden }) => ($hidden ? HERO_COPY_OUT_MS : HERO_COPY_IN_MS)}ms
    ${({ theme }) => theme.data.motion.easing.decelerate};

  /* La columna partida es una mejora de ESCRITORIO (spec S6.5): por debajo
     de este punto de corte el tema claro vuelve a la distribucion
     centrada, igual que el oscuro -- ver tambien ScHero/ScActions. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${({ $light }) =>
      $light &&
      css`
        align-items: flex-start;
        text-align: left;
        /* Medido (spec S3.6): la mano izquierda del arte entra hasta el
           41.5% del hero a 16:10, el caso mas estrecho. El criterio no es
           "40%": es que la linea mas larga de la copia termine antes de
           ese punto. min() con el prose normal cubre el caso comun sin
           magnificar el ancho en viewports muy anchos. */
        max-width: min(70ch, 70%);
      `}
  }

  /* Antes de "chrome": los hijos quedan invisibles por regla ESTATICA, sin
     ninguna animacion en marcha todavia (ver el docblock de cabecera). */
  &[data-intro="pending"] > * {
    opacity: 0;
  }

  /* En "chrome": la animacion se aplica por PRIMERA VEZ aqui, asi que su
     cuenta de animation-delay arranca en este instante, no en el montaje
     del componente. El escalonado interno de 80ms NO cambia. */
  &[data-intro="in"] > * {
    animation: rise ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.decelerate} backwards;
  }
  &[data-intro="in"] > *:nth-child(2) {
    animation-delay: 80ms;
  }
  &[data-intro="in"] > *:nth-child(3) {
    animation-delay: 160ms;
  }
  &[data-intro="in"] > *:nth-child(4) {
    animation-delay: 240ms;
  }
  &[data-intro="in"] > *:nth-child(5) {
    animation-delay: 320ms;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* Visible de inmediato, sin intro (spec §6.5): GlobalStyles colapsa
       animation-duration pero NO animation-delay, asi que hace falta este
       guard explicito -- sin el, un hijo con 320ms de retardo se quedaria
       invisible ese tramo y apareceria de golpe, peor que no animar. Se
       fuerza opacity 1 en los DOS estados de data-intro por la misma razon
       que ScHeader (Navbar.tsx): hay un primer render, antes de que el
       efecto de StageProvider corrija la fase bajo reduce, en el que
       data-intro todavia vale "pending". */
    > * {
      animation: none;
      opacity: 1;
    }
    &[data-intro="pending"] > * {
      opacity: 1;
    }
    transition: none;
  }

  /* Con el ojo oculto en forced-colors, la sombra que protegia la copia sobre
     la ilustracion solo ensuciaria el texto del sistema. */
  @media (forced-colors: active) {
    text-shadow: none;
  }
`;

const ScActions = styled.div<{ $light: boolean }>`
  /* Los CTAs tienen su propio fondo solido: la sombra que protege a la copia
     sobre la ilustracion aqui solo ensuciaria la etiqueta. */
  text-shadow: none;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.data.space[3]};
  justify-content: center;
  /* La mayor separacion del bloque: es la frontera entre leer y actuar. */
  margin-block-start: ${({ theme }) => theme.data.space[6]};

  /* Misma mejora de escritorio que ScHero/ScCopy: por debajo del punto de
     corte, el tema claro vuelve a los CTA centrados. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    ${({ $light }) =>
      $light &&
      css`
        justify-content: flex-start;
      `}
  }
`;

/* El titular de portada usa la unica variante de la escala pensada para el
   hero (theme.data.type.scale.display): BrandName renderiza a font-size: 1em,
   asi que sin que ESTE elemento (el propio <h1>, ver `as="h1"` en `Hero()` --
   auditoria SEO 2026-08-08, el h1 subio de BrandName a este contenedor
   porque BrandName no acepta children y el h1 necesita alojar tambien el
   tagline de abajo) declare su font-size, heredaria el 1em de GlobalStyles
   (que resetea h1..h6 a font-size: 1em) y BrandName quedaria mas pequeno que
   el subtitulo.

   EXCEPCION: font-size es un valor LITERAL pedido por el usuario --
   clamp(34px, 8vw, 258px) en oscuro -- que sustituye a
   min(theme.data.type.scale.display.size, 10vw). Es una decision explicita
   que se salta la escala tipografica (theme.data.type.scale.display) a
   proposito: NO se corrige a un token, se documenta como excepcion. El suelo
   de 34px (mayor que 8vw por debajo de ~425px CSS) sigue evitando que
   "VoidToInfinite" -- 14 caracteres inseparables, hyphens: manual mas abajo
   -- se corte contra el overflow hidden del hero a anchos pequenos.

   En CLARO el factor baja a 7vw (mismo suelo y tope): con la copia pegada a
   la izquierda y compitiendo por ancho con el marco del arte (spec S3.6, la
   columna se limita a min(prose, 40%) para no invadir la mano izquierda),
   8vw hacia el titular mas ancho de lo que esa columna estrecha puede
   sostener sin forzar el ajuste de linea. $light usa `light`
   (`layoutTheme === "light"`, no el tema activo directamente: la copia no
   puede cambiar de tamano en t=0 mientras el fondo del cruce sigue siendo
   el del tema anterior -- mismo criterio que ScCopy, ver useHeroCopySwap). */
const ScHeroBrand = styled.div<{ $light: boolean }>`
  font-size: clamp(34px, 8vw, 258px);

  ${({ $light }) =>
    $light &&
    css`
      font-size: clamp(34px, 7vw, 258px);
    `}

  /* line-height tambien hay que fijarlo: GlobalStyles pone 1.4em en el body,
     que se hereda como LONGITUD ya resuelta (22.4px), no como factor. Sin
     esto la caja del h1 mide 22px con glifos de 56px, el titular se desborda
     de su propia linea y se come el espacio que lo separa del subtitulo. */
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
  /* El body fija hyphens auto: sin esto el navegador puede partir el nombre de
     marca al final de linea. */
  hyphens: manual;
  /* Kicker y titulo son una unidad: el kicker etiqueta al titulo. */
  margin-block-start: ${({ theme }) => theme.data.space[2]};
`;

/* Cambio de tier: el subtitulo se despega del titular. La medida corta lo
   mantiene en dos lineas legibles de un vistazo; con los 65ch de prose a 24px
   seria una sola linea interminable.
   Se consume con forwardedAs="p", NO con as="p": en styled-components v6 el
   prop `as` lo consume el propio wrapper -- renderiza un <p> pelado y descarta
   el componente envuelto --, asi que con `as` el subtitulo perdia TODA la
   escala tipografica de Typography (medido: clase base ausente, font-size
   vacio, color canvastext). `forwardedAs` se pasa hacia abajo como `as` del
   componente envuelto, que es lo que anula el h3 por defecto sin perder el
   estilado.

   EXCEPCION: font-size es un valor LITERAL pedido por el usuario --
   clamp(15px, 2vw, 22px) -- que sustituye al 1.5rem/24px de
   theme.data.type.scale.h3 que aporta variant="h3". Se documenta como
   excepcion, no se corrige a la escala. Gana la cascada por el mismo motivo
   que el color de ScKicker: la clase de ScSubtitle se inyecta despues de la
   de ScTypography. */
const ScSubtitle = styled(Typography)`
  font-size: clamp(15px, 2vw, 22px);
  margin-block-start: ${({ theme }) => theme.data.space[5]};
  max-width: 70ch;
`;

/* Misma prosa que el subtitulo: separacion corta. NO baja a textMuted a
   proposito -- es la linea mas ancha y sus extremos caen sobre la corona, la
   zona mas brillante e irregular de la ilustracion, donde el contraste ya esta
   en QA. La jerarquia la dan tamano, peso, tracking y espacio. */
/* Equilibrado: de pretty a balance (encargo del usuario 2026-08-04, todo el
   texto de cuerpo lleva text-wrap-style balance). Igual que ScBody en
   Contact.tsx, este override tiene que actualizarse a mano aunque Typography
   ya lo declare para sus variantes de cuerpo: styled(Typography) inyecta su
   clase DESPUES y gana la cascada, asi que dejarlo en pretty habria dejado
   justo esta linea del hero con el reparto antiguo. */
const ScSupport = styled(Typography)`
  margin-block-start: ${({ theme }) => theme.data.space[3]};
  max-width: 70ch;
  text-wrap: balance;
  text-wrap-style: balance;
`;

/*
 * CTA primario: MISMO degradado y animacion que ScGradientTail
 * (BrandName.tsx) -- ver alli la excepcion completa al lenguaje de
 * movimiento del sistema (background-position no es una propiedad de
 * compositor, guard no-preference, y por que el colapso de GlobalStyles
 * bajo reduced-motion es un flash de un punto no determinista del
 * degradado, no "gira para siempre"). heroGradient/gradientShift se
 * IMPORTAN de BrandName.tsx en vez de redeclararse aqui: titulo y CTA
 * recorren exactamente el mismo color en el mismo instante, no tres
 * declaraciones que podrian divergir con el tiempo.
 *
 * Aditivo sobre Button: ScButton.tsx no se toca, esto es un envoltorio
 * styled(Button) que anade una capa de fondo por encima -- las 4 variantes x
 * 3 tamanos de Button en cualquier otro punto del sitio siguen exactamente
 * igual porque la clase solo se aplica aqui, via composicion explicita,
 * nunca por defecto.
 */
/*
 * Glow de hover del CTA, con los MISMOS colores que recorre el
 * degradado del titular. Vive en un ::after propio y no en el box-shadow del
 * boton por dos motivos: el pseudo-elemento se puede animar por OPACIDAD
 * (propiedad de compositor, la regla de movimiento de la casa) en vez de
 * animar el box-shadow, que obliga a repintar; y al quedar fuera del flujo no
 * empuja nada ni altera el area de click -- por eso lleva pointer-events:
 * none.
 *
 * La respiracion solo corre MIENTRAS hay hover o foco: no es una animacion
 * ambiental permanente, asi que no arrastra la deuda de "animacion infinita
 * que nadie pausa al salir del viewport" que ya tienen el titular y el fondo
 * de los CTA (anotada en docs/qa-3d-pendiente.md).
 */
const ctaGlowPulse = keyframes`
  from { opacity: 0.65; }
  to { opacity: 1; }
`;

const ctaGlow = css`
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    opacity: 0;
    /* color-mix para dar alfa a un token sin duplicar su valor literal;
       mismo recurso que ya usa Button en su variante soft. */
    box-shadow:
      0 0 18px
        ${({ theme }) =>
          `color-mix(in oklch, ${theme.data.semantic.brandText} 55%, transparent)`},
      0 0 38px
        ${({ theme }) =>
          `color-mix(in oklch, ${theme.data.palette.secondary[300]} 40%, transparent)`};
    transition: opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
  }

  @media (prefers-reduced-motion: no-preference) {
    &:hover::after,
    &:focus-visible::after {
      animation: ${ctaGlowPulse} 1600ms
        ${({ theme }) => theme.data.motion.easing.standard} infinite alternate;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`;

const ScCtaPrimary = styled(Button)`
  ${ctaGlow}

  @media (prefers-reduced-motion: no-preference) {
    ${heroGradient}
    animation: ${gradientShift} 9000ms linear infinite alternate;

    /*
     * FIX (medido en render real): sin esto, al pasar el cursor el
     * degradado desaparecia y el boton volvia a su relleno solid. Causa: la
     * variante solid de Button.tsx (ScButton.tsx, bloque
     * $variant==="solid") declara en su propio :hover
     * background: color-mix(...) -- la propiedad ABREVIADA background, no
     * el longhand background-color. Una abreviatura resetea TODAS sus
     * sub-propiedades a su valor inicial salvo la que se especifica
     * explicitamente, asi que ese hover ponia background-image EN NONE,
     * matando el degradado sin que ninguna otra regla lo tocara.
     *
     * Se reafirma aqui con el MISMO selector que usa Button.tsx para ese
     * hover (:hover:not(:disabled)): misma especificidad exacta, asi que
     * gana por orden de insercion -- styled(Button) inyecta su clase
     * DESPUES de ScButton (mismo patron ya medido y documentado para
     * styled(Typography) en Hero.tsx/BrandName.tsx). Verificado en el
     * navegador real: el bloque de Button aparece antes en la hoja de
     * estilos que el de este componente.
     */
    &:hover:not(:disabled) {
      ${heroGradient}
    }
  }
  /* Bajo reduced-motion no se aplica ninguna capa nueva: el boton conserva
     su fondo solid por defecto (semantic.brandSolid), ya auditado AA por
     contrast.test.ts ("onBrand sobre brandSolid >= 4.5:1"). Cero token
     nuevo para este caso. */
`;

/*
 * CTA SECUNDARIO RETIRADO (encargo 2026-08-08): el hero tenia dos acciones --
 * la primaria al playground ("Explorar los componentes") y la secundaria a
 * `#story` ("Leer la historia"), esta ultima con el degradado aplicado como
 * borde enmascarado (`ScCtaSecondary`) y su label recortado
 * (`ScCtaSecondaryLabel`, `gradientTextClip`). El encargo elimina la
 * referencia al playground y asciende "Leer la historia" a accion principal,
 * asi que el hero queda con UN solo CTA: no hay accion secundaria a la que
 * dar el tratamiento de borde, y mantener el styled sin punto de uso seria
 * codigo muerto. `gradientTextClip` sigue existiendo en BrandName.tsx (lo
 * consume el tramo "ToInfinite" del titular), no se toca.
 */

export function Hero(): ReactElement {
  const { t } = useTranslation("home");
  const { themeName } = useTheme();
  // layoutTheme (NO themeName) decide la distribucion: la copia no puede
  // saltar de sitio en t=0, mientras el fondo todavia es el del tema
  // anterior (ver useHeroCopySwap para el porque completo, spec S6.5).
  const { layoutTheme, hidden } = useHeroCopySwap();
  const light = layoutTheme === "light";
  const { phase } = useStage();
  // "pending" mientras la fase de pagina siga en "backdrop" (spec §7.4): la
  // copia entra en "chrome", a la vez que el navbar, no antes.
  const introState = phase === "backdrop" ? "pending" : "in";

  return (
    <ScHero
      $light={light}
      id="hero"
    >
      <HeroBackdrop />
      {/* El pie oscuro se ata al tema REAL (no a layoutTheme) para apagarse a
          la vez que el propio fondo, no con el retardo del cruce de la copia.
          Y a diferencia del velo, no se desmonta: se apaga por opacidad, para
          que el cambio sea un fundido y no un corte. */}
      <ScHeroFoot
        $light={themeName === "light"}
        aria-hidden="true"
        data-testid="hero-foot"
      />
      <ScCopy
        $light={light}
        $hidden={hidden}
        data-intro={introState}
      >
        <ScHeroBrand
          as="h1"
          $light={light}
          data-testid="hero-title"
        >
          <BrandName gradientTail />
        </ScHeroBrand>
        <ScSubtitle
          variant="h3"
          forwardedAs="p"
          data-testid="hero-subtitle"
        >
          {t("Home.hero.subtitle")}
        </ScSubtitle>
        <ScSupport
          variant="body"
          data-testid="hero-support"
        >
          {t("Home.hero.support")}
        </ScSupport>
        <ScActions
          $light={light}
          data-testid="hero-actions"
        >
          {/* forwardedAs="a", NO as="a": ScCtaPrimary envuelve Button con
              styled(), y Button ya intercepta su propio prop `as`
              internamente (ver Button.tsx) -- el mismo gotcha ya
              documentado arriba para ScSubtitle/Typography.
              Medido en este repo: con `as="a"` styled-components renderiza
              un <a> PELADO con solo la clase del wrapper y descarta Button
              entero (sizeStyles, variantes, ScLabel, spinner); con
              `forwardedAs="a"` Button recibe el as por su propio prop y
              sigue resolviendo su <ScButton as="a">, conservando toda su
              logica -- el wrapper solo anade su clase por encima. */}
          <ScCtaPrimary
            forwardedAs="a"
            href="#story"
            size="lg"
          >
            {t("Home.cta.story")}
          </ScCtaPrimary>
        </ScActions>
      </ScCopy>
    </ScHero>
  );
}
