"use client";
import styled, { css, keyframes } from "styled-components";
import { AMBIENT } from "@/motion/vocabulary";
import type { StoryCosmicBeingBlend } from "./storyCosmicBeing.layers";
import {
  STORY_COSMIC_BEING_OVERSCAN,
  STORY_COSMIC_BEING_VOID,
} from "./storyCosmicBeing.layers";

/*
 * Marco de la escena: isolation: isolate la convierte en el grupo de
 * blending -- sin el, el plus-lighter de las capas se sumaria contra el
 * fondo de la pagina y desbordaria luz fuera de Story (mismo motivo que
 * ScScene en storyCosmicHeart.parts.tsx y ScFrame en eye.parts.tsx).
 */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
`;

/*
 * Negro-violeta de base: el aditivo suma sobre lo que haya detras, y este
 * literal es el mismo STORY_COSMIC_BEING_VOID contra el que se calibro el
 * arte (excepcion de color sancionada, ver su docblock en
 * storyCosmicBeing.layers.ts).
 */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${STORY_COSMIC_BEING_VOID};
`;

const heartBeat = keyframes`
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
`;

/*
 * Una capa. El parallax (rAF de useSceneParallax) y el mix-blend-mode viven
 * en el MISMO elemento a proposito -- cualquier envoltorio con transform
 * crearia su propio contexto de apilamiento y aislaria el blending de su
 * contenido (mismo motivo documentado en ScLayer de storyCosmicHeart.parts.tsx
 * y de eye.parts.tsx). El pulso del nucleo anima opacity, no transform: esa
 * propiedad la escribe el rAF del parallax frame a frame, y una animacion
 * CSS sobre la misma propiedad se pisaria con el.
 *
 * $blend llega por prop en vez de fijar plus-lighter para las 11 capas (como
 * hacia storyCosmicHeart.parts.tsx, ahora obsoleta): 00-space-base es una
 * capa OPACA que hace de base del stack, no una particion de energia mas.
 * Sumarla en aditivo contra el fondo la volveria lechosa (un opaco mas un
 * aditivo no reconstruye nada, solo aclara lo que deberia ser el suelo del
 * lienzo) -- por eso esa capa concreta pide blend "normal" y las otras diez
 * piden "plus-lighter", segun documenta el manifest de esta escena.
 */
export const ScLayer = styled.img<{
  $blend: StoryCosmicBeingBlend;
  $glow?: "core";
}>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${STORY_COSMIC_BEING_OVERSCAN});
  will-change: transform;

  ${({ $blend }) =>
    $blend === "normal"
      ? css`
          mix-blend-mode: normal;
        `
      : css`
          /* screen es el fallback practicamente indistinguible sobre negro;
             plus-lighter es la suma exacta con la que se compuso el arte
             (mismo criterio que ScLayer en storyCosmicHeart.parts.tsx). */
          mix-blend-mode: screen;
          @supports (mix-blend-mode: plus-lighter) {
            mix-blend-mode: plus-lighter;
          }
        `}

  ${({ $glow }) =>
    $glow === "core" &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        /* Task 19 (motion core, punto 7 del brief): 6.5s pasó a
           AMBIENT.pulseMs (arroba/motion/vocabulary) -- mismo valor,
           consumidor real del vocabulario (gate F2: AMBIENT tenía 0
           consumidores antes de esa tarea). Task 20 (motion resto) colapsa
           AMBIENT de 5 campos a 3 y retira pulseMs, fusionado en breathMs --
           el campo con el que comparte rol de coreografía (pulso de
           opacidad/escala en una capa de glow ambiental, no disparado),
           aunque no comparta el mismo mascota. A diferencia de la migración
           de Task 19, ESTE cambio SÍ mueve el valor: el pulso pasa de un
           ciclo de 6.5s a uno de 5.4s (~17% más rápido). Verificado en
           navegador real (capturas t20- del informe de la tarea) que el
           cambio de ritmo no aplana ni cambia el carácter de la escena --
           ver el docblock de AMBIENT en vocabulary.ts para el razonamiento
           completo. */
        animation: ${heartBeat} ${AMBIENT.breathMs}ms ease-in-out infinite;
      }
    `}
`;

/*
 * Viñeta de legibilidad: oscurece la escena bajo el contenido de texto sin
 * tocar el grupo de blending de las capas (vive FUERA de ScScene en el JSX
 * de StoryCosmicBeing, mismo motivo que ScVignette en storyCosmicHeart.parts.tsx
 * -- dentro heredaria isolation:isolate y el aditivo se la comeria en vez de
 * oscurecer). El tope opaco es el MISMO literal que ScVoid (continuidad de
 * color).
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to right,
      ${STORY_COSMIC_BEING_VOID}f2 0%,
      ${STORY_COSMIC_BEING_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${STORY_COSMIC_BEING_VOID}f2 0%,
      ${STORY_COSMIC_BEING_VOID}00 45%
    );
`;
