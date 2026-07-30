"use client";
import styled from "styled-components";
import {
  JOURNEY_ASTRAL_OVERSCAN,
  JOURNEY_ASTRAL_VOID,
} from "./journeyAstralPathway.layers";

/*
 * Marco de la escena: `isolation: isolate` la convierte en el grupo de
 * blending -- mismo motivo que `ScScene` en `storyCosmicHeart.parts.tsx`.
 */
export const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  isolation: isolate;
`;

/* Negro-azulado de base: el aditivo suma sobre lo que haya detras. */
export const ScVoid = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${JOURNEY_ASTRAL_VOID};
`;

/*
 * Una capa. El parallax (rAF de `useSceneParallax`) y el `mix-blend-mode`
 * viven en el MISMO elemento -- mismo motivo que `ScLayer` en
 * `storyCosmicHeart.parts.tsx` (un envoltorio con `transform` aislaria el
 * blending de su contenido). Esta escena no tiene una capa con pulso propio
 * (a diferencia del nucleo del corazon de Story): las 5 capas solo llevan el
 * parallax.
 */
export const ScLayer = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${JOURNEY_ASTRAL_OVERSCAN});
  will-change: transform;

  mix-blend-mode: screen;
  @supports (mix-blend-mode: plus-lighter) {
    mix-blend-mode: plus-lighter;
  }
`;

/*
 * Viñeta de legibilidad, mismo criterio que `ScVignette` en
 * `storyCosmicHeart.parts.tsx`: vive FUERA de `ScScene` en el JSX para no
 * heredar su grupo de blending. Tope opaco = MISMO literal que `ScVoid`
 * (continuidad de color).
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to right,
      ${JOURNEY_ASTRAL_VOID}f2 0%,
      ${JOURNEY_ASTRAL_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${JOURNEY_ASTRAL_VOID}f2 0%,
      ${JOURNEY_ASTRAL_VOID}00 45%
    );
`;
