"use client";
import styled, { css, keyframes } from "styled-components";
import {
  EYE_ASPECT,
  EYE_CENTER,
  EYE_PUPIL_SIZE,
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
 */
export const ScSocket = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  background-color: ${EYE_SURFACE};
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
 */
export const ScLayer = styled.img<{
  $additive: boolean;
  $moves: boolean;
  $glow?: "strong" | "soft";
}>`
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

  ${({ $glow }) =>
    $glow &&
    css`
      animation: ${$glow === "strong" ? glowStrong : glowSoft}
        ${$glow === "strong" ? "7s" : "9s"} ease-in-out infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
        opacity: 1;
      }
    `}
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
 * desaparecer EXACTAMENTE con el ojo. Montado en el hero y condicionado al
 * tema, se montaba y desmontaba de golpe en t=0, cuando el stack contrario
 * todavia esta cruzando -- al pasar a oscuro habria pintado un velo negro
 * sobre el pastel todavia visible, medio segundo antes de que hubiera ninguna
 * corona que apagar. Como hijo del socket, lo arrastra el fundido uniforme del
 * propio stack y el problema no puede darse. Mismo razonamiento por el que la
 * rampa violeta del pie vive dentro de Aura.
 *
 * Va DESPUES de ScFrame y FUERA de el: dentro heredaria su grupo de blending
 * (isolation: isolate) y el aditivo de las capas lo consumiria en vez de
 * oscurecerlas. Entre hermanos del mismo z-index gana el ultimo del DOM.
 *
 * Misma excepcion de color sancionada que el resto de este archivo.
 */
export const ScScrim = styled.div`
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

  @media (forced-colors: active) {
    display: none;
  }
`;

/*
 * Hueco del mascota (Wormhole en oscuro, Sol en claro): cuadrado del DIAMETRO
 * de la pupila, centrado en el mismo centro medido del ojo que usa el anillo
 * de pulso, asi que las tres cosas -- pupila pintada, mascota y onda --
 * comparten eje y tamano.
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
 */
export const ScMascotSlot = styled.div`
  position: absolute;
  top: ${EYE_CENTER.y};
  left: ${EYE_CENTER.x};
  width: ${EYE_PUPIL_SIZE};
  aspect-ratio: 1;
  translate: -50% -50%;
  will-change: transform;
`;
