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
import { useTheme } from "@/theme/ThemeProvider";
import { HeroBackdrop } from "./HeroBackdrop";
import {
  HERO_COPY_IN_MS,
  HERO_COPY_OUT_MS,
  HERO_COPY_STEP_MS,
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
 * La distribucion (antes `$light`, ahora `--hero-align-items-lg`/
 * `--hero-justify-lg`, ver GlobalStyles.tsx) usaba `layoutTheme` de
 * `useHeroCopySwap`, NO el tema activo directamente: la copia no puede
 * saltar de sitio en el mismo instante en que el fondo todavia es el del
 * tema anterior (ver el hook para el porque completo). Task 9 (anti-flash de
 * tema) saco esta rama concreta del prop `$light` y la paso a variables CSS
 * fijadas por atributo (`:root[data-theme]`, GlobalStyles.tsx): es la unica
 * propiedad de Hero que cambia TAMAÑO/POSICION -- no solo color -- entre
 * temas, y el prop tardaba hasta el efecto post-montaje de ThemeProvider en
 * corregirse, produciendo el CLS medido (0,0799 en el arranque oscuro de
 * escritorio, baseline spec 3.1). Las demas ramas de Hero por tema (texto,
 * sombra, fondo) siguen en React: son opacidad/color, no contribuyen a CLS.
 */
const ScHero = styled.section`
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
     igual que el oscuro. Los fallback de var() son el valor CLARO -- el que
     ya hornea el build (ThemeProvider arranca siempre en "light") -- asi que
     un visitante sin JS ve EXACTAMENTE el mismo resultado que antes de esta
     tarea; solo el selector data-theme=dark de :root (GlobalStyles.tsx)
     redefine las variables al valor oscuro, y lo hace ANTES del primer
     pintado. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    justify-content: var(--hero-justify-lg, center);
    align-items: var(--hero-align-items-lg, flex-start);
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
 * Escalonado de entrada de la copia (spec §5). Los DOS extremos, from Y to,
 * se declaran explicitamente: task/lessons.md (2026-07-27) documenta que un
 * keyframe implicito -- confiar en que el navegador complete el extremo que
 * falta con el valor computado del elemento -- deja el recorrido a merced de
 * lo que la cascada resuelva en ese instante, y ya costo una sesion en el
 * escalonado del ojo.
 *
 * Se declara con el helper keyframes de styled-components, no como bloque
 * @keyframes rise dentro del template: el nombre queda hasheado y unico. La
 * forma anterior emitia @keyframes rise LITERAL al nivel superior de la hoja
 * (verificado leyendo out/index.html del build), un nombre global de tres
 * letras que cualquier otro componente podia pisar sin que nada avisara.
 */
const heroCopyRise = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

/*
 * Copy stagger-rise (spec §5): fija el orden de lectura en la carga. Los
 * CUATRO hijos (titulo -- la marca dentro de ScHeroBrand --, subtitulo,
 * linea, acciones) entran con un paso de 80ms (HERO_COPY_STEP_MS), no de
 * 120ms.
 *
 * La calibracion original (spec §5) se hizo con CINCO hijos -- habia un
 * kicker, retirado el 2026-08-08 -- y comparaba ASENTAMIENTOS: con 120ms el
 * CTA terminaba de entrar a 680ms desde el arranque del bloque y con 80ms a
 * 520ms, y a 80ms la secuencia se sigue percibiendo como secuencia. Con los
 * CUATRO hijos de hoy las mismas cuentas dan 560ms y 440ms: el CTA es el
 * hijo 4, arranca a 3 x 80 = 240ms y suma los 200ms de
 * motion.duration.base. 440ms es la cifra vigente; el 520 de antes era la
 * del layout de cinco. Solo transform/opacity.
 *
 * TASK 14 (plan premium F3, 2026-08-11): el CUARTO hijo cambia de CONTENIDO
 * (no de posicion ni de cuenta -- sigue siendo el hijo 3 del DOM, justo antes
 * de ScActions, el mismo hueco que ocupaba `Home.hero.support`). La linea
 * descriptiva ("Del vacio al infinito...", `Home.hero.tagline`) sustituye a
 * la clave huerfana `Home.hero.kicker` (retirada 2026-08-08, sin consumidor
 * desde entonces): cierra el hallazgo SEO "el hero no dice que es esto". El
 * parrafo `Home.hero.support` ("Aunque el infinito...") SALE del hero y pasa
 * a la apertura de Story (ver Story.tsx) -- misma clave, sin duplicar el
 * string. Como el recuento de hijos de ScCopy no cambia (4 antes, 4 ahora),
 * los retardos de mas abajo (incluida la tabla del hijo 4) NO necesitan
 * tocarse.
 *
 * Distribucion por tema (spec S6.5): `align-items`/`text-align`/`max-width`
 * en el breakpoint `lg` (mas abajo) leen las variables CSS de Task 9
 * (`--hero-align-items-lg` y compañia, ver docblock de ScHero) en vez de
 * `$light` -- misma explicacion, no se repite aqui. `$light` SIGUE vivo en
 * este componente para `text-shadow` (mas abajo): esa propiedad es color
 * puro, no contribuye a CLS, y su correccion via React (post-montaje de
 * ThemeProvider) sigue siendo intencional. El cruce entre las dos
 * distribuciones es por OPACIDAD (`$hidden`), nunca interpolando
 * `text-align`/`align-items`: esas dos provocan un re-wrap que no se puede
 * animar. `$hidden` llega ya resuelto por `useHeroCopySwap`, que solo lo
 * activa en cambios de USUARIO -- por eso este componente no necesita saber
 * nada de esa mecanica, solo pintar lo que le llega.
 *
 * ARRANQUE DEL INTRO -- CSS ESTATICO (revision 2026-08-11, Task 10 del plan
 * premium; enmienda fechada de la spec §5.3/§5.4/§7.4). El escalonado de
 * 80ms de los CUATRO hijos (HERO_COPY_STEP_MS), su duracion
 * (motion.duration.base), su curva (easing.decelerate) y su recorrido de
 * 10px NO cambian: cambia el MOTOR, no la partitura.
 *
 * Lo que cambia: hasta esta revision la animacion no existia hasta que la
 * maquina de fases de la pagina (useStage) escribia data-intro=in en ESTE
 * elemento, y hasta entonces los hijos quedaban a opacity 0 por una regla
 * estatica. Eso encadenaba el texto del hero -- incluido el h1, y con el el
 * candidato LCP -- a que el bundle descargara, React hidratara, HeroBackdrop
 * ganara su carrera de decode() y ADEMAS pasaran los HERO_CHROME_OFFSET_MS.
 * Medido en Chrome real sobre el build estatico (serve out, cache fria,
 * PerformanceObserver con buffered: true): LCP 1268ms en claro escritorio,
 * 1292ms en claro movil y 4520ms con CPU 4x + Slow 4G, con FCP a
 * 156/68/812ms -- entre 1,1s y 3,7s de hero sin texto DESPUES de que el
 * navegador ya estuviera pintando.
 *
 * Ahora la animacion se declara SIN NINGUNA CONDICION de JS, asi que viaja
 * en el CSS del HTML exportado y su reloj arranca con el primer pintado del
 * bloque: el texto es visible -- y candidato LCP elegible -- sin esperar a
 * nada, tambien con JavaScript deshabilitado. data-intro desaparece de este
 * componente: una propiedad, un dueño.
 *
 * EL UNICO NUMERO QUE CAMBIA, y por que: HERO_CHROME_OFFSET_MS (760ms) ya no
 * retrasa esta entrada. Ese offset no es RITMO, es SINCRONIA: mide el
 * instante en que el ultimo escalon del fondo va por la mitad de su fundido
 * (spec §5.2), contado desde un evento -- el arranque del stack -- que solo
 * JS conoce y que un reloj CSS estatico no puede observar. Conservarlo como
 * retardo fijo habria mantenido 760ms de hero sin texto en CADA carga sin
 * comprar nada: en la carga lenta, que es justo donde el LCP importa, el
 * fondo (que conserva su decode-gating en JS a proposito -- es arte, no LCP
 * de texto) llega mucho DESPUES de esos 760ms de todas formas, asi que el
 * orden del brief (primero el arte, al final los textos) tampoco se
 * preservaba. El navbar SI conserva el offset verbatim (ver ScHeader en
 * Navbar.tsx): no es candidato LCP en ninguna de las mediciones, asi que
 * ahi el numero se paga sin coste y al-final-el-navbar sigue cumpliendose al
 * pie de la letra.
 *
 * CONVIVENCIA con la transition de opacity que ScCopy YA declara para
 * $hidden (mas abajo): son dos canales de opacidad en elementos DISTINTOS
 * -- $hidden anima la opacidad de ESTE contenedor (el cruce de tema
 * completo, que sigue siendo JS), mientras que la animacion de intro anima
 * la de sus HIJOS DIRECTOS (> *). No hay ninguna propiedad compartida en el
 * MISMO elemento que pueda pisarse: la opacidad efectiva de un hijo es el
 * PRODUCTO visual de las dos (un hijo a opacity 1 sigue invisible si su
 * padre esta en opacity 0), nunca una sobreescritura de la misma regla. Y
 * tampoco se solapan en el tiempo: la animacion de intro termina 440ms
 * despues del montaje (240ms del ultimo retardo + 200ms de duracion) y no
 * vuelve a arrancar nunca -- su animation-name computado es el MISMO en los
 * dos temas, y una animacion CSS solo reinicia su reloj cuando ese nombre
 * cambia (spec §6.1), no porque styled-components regenere la clase del
 * contenedor al cambiar de tema. El primer cambio de tema de usuario es muy
 * posterior a esos 440ms.
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
     centrada, igual que el oscuro -- ver tambien ScHero/ScActions. Task 9:
     mismas variables CSS que ScHero (align-items comparte
     --hero-align-items-lg, mismo valor logico en los dos componentes) --
     ver el docblock de ScHero para el porque completo del cambio de prop a
     variable. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    align-items: var(--hero-align-items-lg, flex-start);
    text-align: var(--hero-text-align-lg, left);
    /* Medido (spec S3.6): la mano izquierda del arte entra hasta el 41.5%
       del hero a 16:10, el caso mas estrecho. El criterio no es "40%": es
       que la linea mas larga de la copia termine antes de ese punto. min()
       con el prose normal cubre el caso comun sin magnificar el ancho en
       viewports muy anchos. */
    max-width: var(--hero-copy-maxwidth-lg, min(70ch, 70%));
  }

  /* Intro de carga, SIN condicion de JS (ver el docblock de cabecera): la
     regla existe en el CSS del HTML exportado, asi que su reloj arranca con
     el primer pintado del bloque y el texto entra igual con JavaScript
     deshabilitado. backwards, no both: el estado final de la animacion (los
     hijos ya no declaran opacity ni transform propios) coincide con el valor
     de reposo, asi que solo hace falta rellenar hacia atras el tramo del
     retardo. */
  > * {
    animation: ${heroCopyRise} ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.decelerate} backwards;
  }
  /* El primer hijo NO declara retardo: entra a 0ms, con el primer pintado.
     El resto escalona con HERO_COPY_STEP_MS, la constante importada -- nunca
     un literal reescrito (regla 13 de RULES.md).

     La tabla llega al hijo 4 y ahi termina. Hasta el 2026-08-11 declaraba
     ademas un nth-child(5) con 320ms, resto del kicker que se retiro el
     2026-08-08: no matcheaba ningun elemento (el propio Hero.test.tsx
     asevera que los hijos son CUATRO), y su 320ms era el origen de la cifra
     de asentamiento equivocada -- 520ms -- que arrastraban tres docblocks.
     Con cuatro hijos el ultimo arranca a 3 x 80 = 240ms y se asienta a
     240 + 200 = 440ms. */
  > *:nth-child(2) {
    animation-delay: ${HERO_COPY_STEP_MS}ms;
  }
  > *:nth-child(3) {
    animation-delay: ${2 * HERO_COPY_STEP_MS}ms;
  }
  > *:nth-child(4) {
    animation-delay: ${3 * HERO_COPY_STEP_MS}ms;
  }

  @media (prefers-reduced-motion: reduce) {
    /* Visible de inmediato, sin intro (spec §6.5): GlobalStyles colapsa
       animation-duration pero NO animation-delay, asi que hace falta este
       guard explicito -- sin el, el ultimo hijo, con sus 240ms de retardo,
       se quedaria invisible ese tramo (fill backwards) y apareceria de
       golpe, peor que
       no animar. Ya no hace falta repetirlo para ningun estado de
       data-intro: ese atributo desaparecio de este componente, asi que este
       unico bloque cubre el caso entero. */
    > * {
      animation: none;
      opacity: 1;
      transform: none;
    }
    transition: none;
  }

  /* Con el ojo oculto en forced-colors, la sombra que protegia la copia sobre
     la ilustracion solo ensuciaria el texto del sistema. */
  @media (forced-colors: active) {
    text-shadow: none;
  }
`;

const ScActions = styled.div`
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
     corte, el tema claro vuelve a los CTA centrados. Task 9: variable CSS
     propia (no comparte --hero-justify-lg con ScHero: los dos van de un
     valor CENTRADO distinto a otro extremo distinto) -- ver el docblock de
     ScHero para el porque completo del cambio de prop a variable. */
  @media ${({ theme }) => theme.data.breakPoint.lg} {
    justify-content: var(--hero-actions-justify-lg, flex-start);
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
   sostener sin forzar el ajuste de linea.

   TASK 9 (anti-flash de tema): este es el elemento LCP de la medicion de CLS
   del arranque oscuro en escritorio (0,0799, baseline spec 3.1) -- el UNICO
   shift registrado caia justo aqui, porque el factor pasaba de React
   (`$light`, derivado de `layoutTheme`) y tardaba hasta el efecto post-
   montaje de ThemeProvider en corregirse de 7vw a 8vw. Sustituido por la
   variable CSS `--hero-title-vw` (GlobalStyles.tsx, fijada por el atributo
   que el script pre-pintado de app/layout.tsx pone en <html> ANTES del
   primer frame): el fallback de var() es el valor CLARO (7vw, el que ya
   hornea el build), y solo `:root[data-theme="dark"]` lo redefine a 8vw --
   activo desde el primer pintado, sin esperar a React. Sin JS, el resultado
   es identico al de antes de esta tarea. */
const ScHeroBrand = styled.div`
  font-size: clamp(34px, var(--hero-title-vw, 7vw), 258px);

  /* line-height tambien hay que fijarlo: GlobalStyles pone 1.4em en el body,
     que se hereda como LONGITUD ya resuelta (22.4px), no como factor. Sin
     esto la caja del h1 mide 22px con glifos de 56px, el titular se desborda
     de su propia linea y se come el espacio que lo separa del subtitulo. */
  line-height: ${({ theme }) => theme.data.type.scale.display.lineHeight};
  /* El body fija hyphens auto: sin esto el navegador puede partir el nombre de
     marca al final de linea. */
  hyphens: manual;
  /* Separa el titulo del borde superior de ScCopy. Ya NO lo justifica ningun
     kicker (retirado el 2026-08-08, nunca volvio a esta posicion): espaciado
     heredado, sin remedir si sigue haciendo falta. */
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

/*
 * TASK 14 (plan premium F3, 2026-08-11): este componente se llamaba
 * `ScSupport` y pintaba `Home.hero.support` ("Aunque el infinito..."), que
 * SALE del hero hacia la apertura de Story (ver Story.tsx) -- misma clave,
 * sin duplicar el string. Ocupa la MISMA posicion visual (hijo 3 de ScCopy,
 * justo antes de ScActions) y la MISMA hoja de estilos: solo cambia el
 * CONTENIDO, la clave (`Home.hero.tagline`, que sustituye a la huerfana
 * `Home.hero.kicker`) y el nombre. Es la linea que cierra el hallazgo SEO "el
 * hero no dice que es esto" -- escalon tipografico del sistema (variant=body,
 * un token, no un literal nuevo) entre la marca y el CTA.
 *
 * Mismo tratamiento que el subtitulo: separacion corta, sin bajar a
 * textMuted a proposito. ScCopy ya protege TODO su texto en oscuro con un
 * text-shadow propio (ver su docblock, mas arriba: "segunda linea de defensa
 * del contraste... los parrafos son mas anchos que la pupila y sus extremos
 * caen sobre la corona"), asi que esta linea hereda esa proteccion sin
 * necesitar una propia, sea cual sea su ancho -- medido en navegador real
 * (1280x720 oscuro): 458.73px, MAS ESTRECHA que el subtitulo (585.94px), a
 * diferencia del `Home.hero.support` que sustituye. La jerarquia la dan
 * tamano, peso, tracking y espacio.
 */
/* Equilibrado: de pretty a balance (encargo del usuario 2026-08-04, todo el
   texto de cuerpo lleva text-wrap-style balance). Igual que ScBody en
   Contact.tsx, este override tiene que actualizarse a mano aunque Typography
   ya lo declare para sus variantes de cuerpo: styled(Typography) inyecta su
   clase DESPUES y gana la cascada, asi que dejarlo en pretty habria dejado
   justo esta linea del hero con el reparto antiguo. */
const ScTagline = styled(Typography)`
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
  // Este componente ya no consume useStage(): desde la revision 2026-08-11 el
  // intro de la copia es CSS estatico y no depende de ninguna fase de JS (ver
  // el docblock de ScCopy). HeroBackdrop, mas abajo, sigue necesitando
  // JavaScript para su propio decode-gating -- pero ya no via useStage(): esa
  // maquina se retiro entera (Task 27, sin ningun consumidor real desde esta
  // misma revision).

  return (
    <ScHero id="hero">
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
      >
        <ScHeroBrand
          as="h1"
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
        <ScTagline
          variant="body"
          data-testid="hero-tagline"
        >
          {t("Home.hero.tagline")}
        </ScTagline>
        <ScActions data-testid="hero-actions">
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
