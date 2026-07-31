"use client";
import styled, { css, keyframes } from "styled-components";
import {
  STORY_COSMIC_HEART_OVERSCAN,
  STORY_COSMIC_HEART_VOID,
} from "./storyCosmicHeart.layers";

/*
 * Marco de la escena: `isolation: isolate` la convierte en el grupo de
 * blending -- sin el, el `plus-lighter` de las capas se sumaria contra el
 * fondo de la pagina y desbordaria luz fuera de Story (mismo motivo que
 * `ScFrame` en eye.parts.tsx).
 */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
`;

/*
 * Negro-violeta de base: el aditivo suma sobre lo que haya detras, y este
 * literal es el mismo `STORY_COSMIC_HEART_VOID` contra el que se calibro el
 * arte (excepcion de color sancionada, ver su docblock en
 * storyCosmicHeart.layers.ts).
 */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${STORY_COSMIC_HEART_VOID};
`;

const heartBeat = keyframes`
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
`;

/*
 * Una capa. El parallax (rAF de `useSceneParallax`) y el `mix-blend-mode`
 * viven en el MISMO elemento a proposito -- cualquier envoltorio con
 * `transform` crearia su propio contexto de apilamiento y aislaria el
 * blending de su contenido (mismo motivo documentado en `ScLayer` de
 * eye.parts.tsx). El pulso del nucleo anima `opacity`, no `transform`: esa
 * propiedad la escribe el rAF del parallax frame a frame, y una animacion
 * CSS sobre la misma propiedad se pisaria con el.
 */
export const ScLayer = styled.img<{ $glow?: "core" }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${STORY_COSMIC_HEART_OVERSCAN});
  will-change: transform;

  /* screen es el fallback practicamente indistinguible sobre negro;
     plus-lighter es la suma exacta con la que se extrajeron las mascaras
     (mismo criterio que ScLayer en eye.parts.tsx). */
  mix-blend-mode: screen;
  @supports (mix-blend-mode: plus-lighter) {
    mix-blend-mode: plus-lighter;
  }

  ${({ $glow }) =>
    $glow === "core" &&
    css`
      @media (prefers-reduced-motion: no-preference) {
        animation: ${heartBeat} 6.5s ease-in-out infinite;
      }
    `}
`;

/*
 * Viñeta de legibilidad: oscurece la escena bajo el contenido de texto sin
 * tocar el grupo de blending de las capas (vive FUERA de ScScene en el JSX
 * de StoryCosmicHeart, mismo motivo que ScScrim en eye.parts.tsx -- dentro
 * heredaria isolation:isolate y el aditivo se la comeria en vez de
 * oscurecer). El tope opaco es el MISMO literal que ScVoid (continuidad de
 * color, mismo criterio que el sellado Hero->Story de EYE_SURFACE).
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to right,
      ${STORY_COSMIC_HEART_VOID}f2 0%,
      ${STORY_COSMIC_HEART_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${STORY_COSMIC_HEART_VOID}f2 0%,
      ${STORY_COSMIC_HEART_VOID}00 45%
    );
`;
