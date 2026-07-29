"use client";
import styled, { css, keyframes, type DataAttributes } from "styled-components";
import {
  HERO_FADE_MS,
  HERO_STEP_MS,
} from "@/components/sections/Hero/hero.transition";
import {
  EYE_ASPECT,
  EYE_CENTER,
  EYE_PUPIL_SIZE,
  EYE_STAGGER,
  EYE_SURFACE,
} from "./eye.layers";

/*
 * Excepcion sancionada del sistema (la misma que `BackOrbs`, ver
 * `src/components/layout/BackOrbs/BackOrbs.tsx`, "Excepcion sancionada"): el
 * ojo es `aria-hidden`, puramente decorativo -- sus colores son espectaculo
 * de marca, no roles de UI. Por eso los `oklch()` literales de este archivo
 * (el negro del lienzo y el blanco del anillo de pulso) leen valores fijos en
 * vez de `theme.data.semantic.*`. Un rol semantico cambiaria con el tema y
 * romperia la continuidad de la identidad: la composicion es negra en claro y
 * en oscuro, siempre.
 */

/*
 * El lienzo del ojo. Ocupa el hero entero y pinta el negro de fondo: es lo
 * primero que se ve, antes de que llegue ningun WebP, asi que el hero nunca
 * pasa por un rectangulo del color de `semantic.bg` (que en oscuro es un gris
 * -- oklch(0.22 ...) --, no negro, y se leia exactamente asi: como un
 * rectangulo gris).
 *
 * Lleva su propio escalonado (tarea B2, data-part="socket" en Eye.tsx): el
 * pozo tiene que aparecer y cerrarse EXACTAMENTE con la mascota que contiene
 * (spec S4.1, sinonimo socket = mascot, escalon 0 -- ver el docblock de
 * eyeStep, mas abajo).
 */
export const ScSocket = styled.div<DataAttributes>`
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: ${EYE_SURFACE};

  ${({ "data-part": part }) => eyeStagger(part as string | undefined)}
`;

/*
 * Marco de la composicion: mantiene la relacion de aspecto EXACTA del lienzo
 * original, asi que las cinco capas quedan registradas entre si sin calcular
 * nada -- todas se estiran igual. `isolation: isolate` lo convierte en el
 * grupo de blending: sin el, el `plus-lighter` de las capas se sumaria contra
 * el fondo de la pagina y desbordaria luz fuera del hero.
 *
 * En viewports verticales el lienzo 16:9 dejaria el ojo como una franja
 * estrecha rodeada de negro; ampliarlo recupera presencia a cambio de recortar
 * las puntas del parpado, que es el intercambio correcto en movil. El 185%
 * sale de igualar la altura del marco (185% * 375px / 1.777 = 390px) con la
 * altura de la copia del hero en ese ancho (~340px): asi el texto queda
 * DENTRO del ojo en vez de desbordarlo por arriba y por abajo.
 */
export const ScFrame = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  aspect-ratio: ${EYE_ASPECT};
  transform: translate(-50%, -50%);
  isolation: isolate;

  @media (max-aspect-ratio: 1 / 1) {
    width: 185%;
  }
`;

const glowStrong = keyframes`
  0%, 100% { opacity: 0.84; }
  50% { opacity: 1; }
`;

const glowSoft = keyframes`
  0%, 100% { opacity: 0.92; }
  50% { opacity: 1; }
`;

/*
 * Escalon de cada pieza en el escalonado de carga/cruce de temas del ojo
 * (spec S4.1, S6.1-S6.2). Los sinonimos se resuelven ANTES de buscar el
 * indice en EYE_STAGGER -- "socket" y "scrim" no ocupan entrada propia, son
 * el MISMO instante visual que la pieza junto a la que se listan (ver el
 * docblock de EYE_STAGGER en eye.layers.ts para el porque de cada uno):
 * - "socket" (el lienzo negro, ScSocket) equivale a "mascot" (escalon 0): el
 *   pozo tiene que aparecer y cerrarse EXACTAMENTE con la mascota que
 *   contiene.
 * - "scrim" (el velo de contraste, ScScrim) equivale a "pupil" (escalon 5,
 *   el ultimo): existe para la copia, que llega despues de todas las capas.
 *
 * Misma defensa que auraStep (aura.parts.tsx): un data-part desconocido o
 * ausente devuelve 0 en vez de -1 o NaN, para que una capa mal etiquetada no
 * rompa el escalonado entero -- se confunde con el primer escalon en vez de
 * con "sin retardo definido".
 */
function eyeStep(part: string | undefined): number {
  const key = part === "socket" ? "mascot" : part === "scrim" ? "pupil" : part;
  const index = (EYE_STAGGER as readonly string[]).indexOf(key ?? "");
  return index === -1 ? 0 : index;
}

/*
 * Keyframes DEDICADOS del escalonado -- heroEyeIn/heroEyeOut, no
 * glowStrong/glowSoft reutilizados -- con endpoints EXPLICITOS (from Y to),
 * no implicitos (spec S6.2): un fotograma implicito se resuelve contra el
 * valor SUBYACENTE de la propiedad -- aqui, el propio glow -- y produce una
 * curva que depende de en que punto de su respiracion este la capa en ese
 * instante. Medido: con endpoints explicitos, opacity 0.5 EXACTO a mitad de
 * recorrido; con endpoint implicito, 0.422 -- se quiere lo primero,
 * determinista.
 */
const heroEyeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const heroEyeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

/*
 * El escalonado de carga/cruce de temas de UNA capa del ojo -- compartido por
 * ScSocket, ScLayer, ScMascotSlot y ScScrim (tarea B2) -- declarado como
 * ANIMACION, no como transicion, a diferencia de auraStagger (aura.parts.tsx,
 * su espejo exacto en tema claro). El motivo esta MEDIDO, no es preferencia:
 * task/lessons.md (2026-07-26) registra que una @keyframes sobre una
 * propiedad IMPIDE que su transition llegue a existir -- iris y pupil YA
 * animan opacity con @keyframes (glowStrong/glowSoft, la respiracion de la
 * corona, arriba), asi que un transition-delay por capa seria codigo muerto
 * justo ahi.
 *
 * Medido en Chromium (reloj conducido a mano via Animation.currentTime, spec
 * S6.1): dos animaciones CSS sobre la misma propiedad del mismo elemento SI
 * conviven, y gana la ULTIMA de la lista animation-name. Por eso la entrada
 * de este escalonado (heroEyeIn/heroEyeOut) va SIEMPRE la ultima cuando hay
 * glow, nunca la primera -- el orden importa, medido: `pIn, pGlow` (glow al
 * final) queda fijo en 0.2 siempre, control negativo. Con `pGlow, pIn` (glow
 * primero, stagger ultimo): en el retardo, 0 (fill backwards sostiene el
 * valor `from` contra la infinita); a mitad, 0.5; al terminar, el glow retoma
 * el control (0.851). A la salida (fill forwards): a mitad, 0.5; despues, 0
 * sostenido contra la animacion infinita.
 *
 * `glow` llega como parametro EXPLICITO de la pieza que llama (ScLayer se lo
 * pasa desde su propio prop $glow), no se relee de ningun sitio: asi la
 * lista compuesta -- <glow>, heroEyeIn/heroEyeOut -- queda en UNA sola
 * declaracion de longhands en vez de dos bloques `animation-name`
 * independientes que no se suman (el segundo pisaria al primero).
 *
 * `opacity: 1` es el valor por DEFECTO, no 0: sin un ancestro con
 * [data-state="..."], <Eye/> se ve normal -- exactamente como la monta su
 * propio test (Eye.test.tsx), fuera de cualquier backdrop. Si el defecto
 * fuera 0, ese render se veria invisible sin que nada lo distinguiera de un
 * bug real (mismo razonamiento que auraStagger).
 *
 * El selector es DESCENDIENTE ([data-state="..."] &), NO calificado
 * (&[data-state="..."]): el atributo data-state vive en el envoltorio del
 * stack que monta HeroBackdrop (ScEyeStack), no en el propio elemento --
 * mismo gotcha que documenta CLAUDE.md S5.1 y que auraStagger ya resuelve
 * igual.
 *
 * Al salir, el retardo se cuenta EN REVERSO: (EYE_STAGGER.length - 1 - paso)
 * en vez de paso -- misma formula que auraStagger, aplicada contra la
 * LONGITUD PROPIA de esta tabla (6, no 5). Con ella, mascot/socket (paso 0)
 * reciben el retardo MAYOR y son los ULTIMOS en apagarse: exactamente lo que
 * pide el brief ("por ultimo el Wormhole").
 *
 * Guard de prefers-reduced-motion sobre los TRES estados, no solo
 * active/leaving: GlobalStyles.tsx colapsa animation-duration a 0.001ms bajo
 * reduce pero NO toca animation-delay. Sin este guard, una capa que pasara a
 * "active" con 550ms de retardo y fill: backwards quedaria invisible medio
 * segundo y luego aparaceria de golpe -- peor que no animar. Bajo reduce, la
 * maquina de fases entrega el estado final de inmediato (spec S7.1), asi que
 * forzar opacity: 1 en los tres estados es seguro: no hay ningun "pending"
 * real que deba quedar oculto.
 */
function eyeStagger(part: string | undefined, glow?: "strong" | "soft") {
  const step = eyeStep(part);
  const glowAnim =
    glow === "strong" ? glowStrong : glow === "soft" ? glowSoft : undefined;
  const glowDurationMs =
    glow === "strong" ? "7s" : glow === "soft" ? "9s" : undefined;

  return css`
    opacity: 1;

    ${
      glow &&
      css`
        animation-name: ${glowAnim};
        animation-duration: ${glowDurationMs};
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
      `
    }

    /*
     * Guard AMBIENTAL, incondicional -- sin depender de ningun ancestro
     * [data-state="..."]. Cubre el caso que los TRES guards de mas abajo no
     * pueden cubrir: un <Eye/> montado SIN ese ancestro (exactamente como lo
     * monta Eye.test.tsx, y como lo montaria cualquier consumidor futuro que
     * no pase por HeroBackdrop). Sin este bloque, esa capa sigue respirando
     * bajo reduce -- el glow (glowStrong/glowSoft) declarado unas lineas
     * arriba no depende de ningun [data-state], asi que ningun guard
     * calificado por ese selector llega a aplicarse nunca en ese render, y
     * la respiracion de la corona queda encendida bajo reduced-motion.
     *
     * Hacen falta LOS DOS niveles: este (ambiental) apaga la respiracion
     * cuando NO hay escalonado en marcha (el caso de arriba); los tres
     * [data-state="..."] de mas abajo apagan ademas el animation-delay del
     * escalonado en si, que GlobalStyles.tsx NO colapsa (solo colapsa
     * animation-duration) -- sin ellos, una capa que pasara a "active" con
     * 550ms de retardo y fill: backwards quedaria invisible medio segundo
     * bajo reduce. Ninguno de los dos sustituye al otro: cubren dos
     * situaciones de montaje distintas.
     */
    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 1;
    }

    [data-state="pending"] & {
      opacity: 0;
      animation: none;
    }

    [data-state="active"] & {
      ${
        glow
          ? css`
              animation-name: ${glowAnim}, ${heroEyeIn};
              animation-duration: ${glowDurationMs}, ${HERO_FADE_MS}ms;
              animation-delay: 0s, ${step * HERO_STEP_MS}ms;
              animation-timing-function:
                ease-in-out,
                ${({ theme }) => theme.data.motion.easing.decelerate};
              animation-iteration-count: infinite, 1;
              animation-fill-mode: none, backwards;
            `
          : css`
              animation-name: ${heroEyeIn};
              animation-duration: ${HERO_FADE_MS}ms;
              animation-delay: ${step * HERO_STEP_MS}ms;
              animation-timing-function: ${({ theme }) =>
                theme.data.motion.easing.decelerate};
              animation-iteration-count: 1;
              animation-fill-mode: backwards;
            `
      }
    }

    [data-state="leaving"] & {
      ${
        glow
          ? css`
              animation-name: ${glowAnim}, ${heroEyeOut};
              animation-duration: ${glowDurationMs}, ${HERO_FADE_MS}ms;
              animation-delay:
                0s, ${(EYE_STAGGER.length - 1 - step) * HERO_STEP_MS}ms;
              animation-timing-function:
                ease-in-out,
                ${({ theme }) => theme.data.motion.easing.decelerate};
              animation-iteration-count: infinite, 1;
              animation-fill-mode: none, forwards;
            `
          : css`
              animation-name: ${heroEyeOut};
              animation-duration: ${HERO_FADE_MS}ms;
              animation-delay: ${(EYE_STAGGER.length - 1 - step) * HERO_STEP_MS}ms;
              animation-timing-function: ${({ theme }) =>
                theme.data.motion.easing.decelerate};
              animation-iteration-count: 1;
              animation-fill-mode: forwards;
            `
      }
    }

    @media (prefers-reduced-motion: reduce) {
      [data-state="active"] &,
      [data-state="leaving"] &,
      [data-state="pending"] & {
        animation: none;
        opacity: 1;
      }
    }
  `;
}

/*
 * Una capa. El `transform` del parallax y el `mix-blend-mode` viven en el
 * MISMO elemento a proposito: cualquier elemento que cree un contexto de
 * apilamiento (y `transform` crea uno) aisla el blending de sus hijos, asi que
 * envolver la imagen en un div transformado dejaria a la imagen sumandose
 * contra un grupo vacio -- el aditivo desapareceria sin error visible, solo
 * halos sucios en los bordes con feathering.
 *
 * Por el mismo motivo el "respirar" de la corona anima `opacity` y no `scale`:
 * la propiedad `transform` de estos elementos la escribe el rAF del
 * seguimiento del cursor (`Eye.tsx`) frame a frame, y una animacion CSS sobre
 * la misma propiedad se pisaria con ella. `opacity` es la otra propiedad
 * barata (compositor puro) y no colisiona.
 *
 * El glow (cuando lo hay) se compone con el escalonado de carga/cruce de
 * temas en UNA SOLA declaracion de longhands (eyeStagger, arriba): dos
 * bloques `animation-name` independientes no se suman, el segundo pisaria al
 * primero -- ver el docblock de eyeStagger para el razonamiento completo
 * (task/lessons.md 2026-07-26).
 */
export const ScLayer = styled.img<
  {
    $additive: boolean;
    $moves: boolean;
    $glow?: "strong" | "soft";
  } & DataAttributes
>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;

  ${({ $additive }) =>
    $additive &&
    css`
      /* screen es el fallback correcto y practicamente indistinguible sobre
         negro; plus-lighter es la suma exacta con la que se extrajeron las
         mascaras. */
      mix-blend-mode: screen;
      @supports (mix-blend-mode: plus-lighter) {
        mix-blend-mode: plus-lighter;
      }
    `}

  ${({ $moves }) =>
    $moves &&
    css`
      will-change: transform;
    `}

  ${({ $glow, "data-part": part }) =>
    eyeStagger(part as string | undefined, $glow)}
`;

/*
 * Velo de contraste de la composicion oscura. La copia se lee sobre la pupila
 * -- negra, contraste de sobra -- pero los parrafos son mas anchos que ella y
 * sus extremos caen sobre la corona, que es la zona mas brillante. Este
 * degradado radial, anclado al MISMO centro que el ojo, la apaga justo debajo
 * del texto y se desvanece antes de tocar el anillo exterior, que es lo que
 * hay que preservar.
 *
 * Vive AQUI, dentro de la composicion, y no en Hero.tsx, aunque su motivo sea
 * la legibilidad de la copia: al cambiar de tema tiene que aparecer y
 * desaparecer EXACTAMENTE con el ojo. Lleva su propio escalonado (eyeStagger,
 * sinonimo "scrim" = "pupil", el ULTIMO escalon -- spec S4.1): el velo existe
 * unicamente para la copia, que llega despues de que todas las capas hayan
 * terminado de asentarse, asi que revelarlo antes solo oscureceria un lienzo
 * que ya es negro, sin ningun texto al que dar contraste todavia. Mismo
 * razonamiento por el que la rampa violeta del pie lleva su propio
 * escalonado dentro de Aura (auraStagger, aura.parts.tsx).
 *
 * Va DESPUES de ScFrame y FUERA de el: dentro heredaria su grupo de blending
 * (isolation: isolate) y el aditivo de las capas lo consumiria en vez de
 * oscurecerlas. Entre hermanos del mismo z-index gana el ultimo del DOM.
 *
 * Misma excepcion de color sancionada que el resto de este archivo.
 */
export const ScScrim = styled.div<DataAttributes>`
  position: absolute;
  inset: 0;
  z-index: ${({ theme }) => theme.data.zIndex.base};
  pointer-events: none;
  background: radial-gradient(
    ellipse 32% 30% at ${EYE_CENTER.x} ${EYE_CENTER.y},
    oklch(0 0 0 / 0.82) 0%,
    oklch(0 0 0 / 0.6) 58%,
    transparent 88%
  );

  ${({ "data-part": part }) => eyeStagger(part as string | undefined)}

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Hueco del mascota (el Wormhole: esta composicion es solo la oscura, ver
 * Eye.tsx): cuadrado del DIAMETRO de la pupila, centrado en el mismo centro
 * medido del ojo que usa el velo de contraste, asi que pupila pintada,
 * mascota y velo comparten eje. El anillo de pulso simple ya no vive aqui --
 * se mudo a la composicion clara, que es la unica que lo monta; en oscuro la
 * coreografia del pulso la trae el propio Wormhole.
 *
 * El centrado usa la propiedad independiente `translate` y no `transform`
 * porque `transform` la escribe el rAF del seguimiento del cursor (`Eye.tsx`)
 * frame a frame: la mascota viaja con la capa de la pupila, a su misma
 * profundidad. Si el centrado viviera en `transform`, cada frame lo
 * sobrescribiria y la mascota saltaria al vertice superior izquierdo.
 *
 * Blending normal, no aditivo como las capas: la mascota no forma parte de la
 * particion de la imagen (no es una de las mascaras que suman 1), es una pieza
 * que se posa encima. Sobre el pozo negro de la pupila el resultado es el
 * mismo, y evita que el `backdrop-filter` del iris de Sol tenga que resolverse
 * dentro de un grupo con blending.
 *
 * Escalon 0 del escalonado (eyeStagger): es la mascota misma que da nombre a
 * "mascot" en EYE_STAGGER, asi que aparece primero y se apaga la ultima -- lo
 * que pide el brief ("por ultimo el Wormhole").
 */
export const ScMascotSlot = styled.div<DataAttributes>`
  position: absolute;
  top: ${EYE_CENTER.y};
  left: ${EYE_CENTER.x};
  width: ${EYE_PUPIL_SIZE};
  aspect-ratio: 1;
  translate: -50% -50%;
  will-change: transform;

  ${({ "data-part": part }) => eyeStagger(part as string | undefined)}
`;
