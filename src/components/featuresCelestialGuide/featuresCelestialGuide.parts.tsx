"use client";
import styled from "styled-components";
import {
  FEATURES_CELESTIAL_OVERSCAN,
  FEATURES_CELESTIAL_VOID,
} from "./featuresCelestialGuide.layers";

/*
 * Marco de la escena: `isolation: isolate` la convierte en el grupo de
 * blending -- mismo motivo que `ScScene` en `storyCosmicHeart.parts.tsx`/
 * `journeyAstralPathway.parts.tsx`.
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
  background-color: ${FEATURES_CELESTIAL_VOID};
`;

/*
 * Una capa. El parallax (rAF de `useSceneParallax`) y el `mix-blend-mode`
 * viven en el MISMO elemento -- mismo motivo que `ScLayer` en las otras dos
 * escenas oscuras (un envoltorio con `transform` aislaria el blending de su
 * contenido).
 */
export const ScLayer = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${FEATURES_CELESTIAL_OVERSCAN});
  will-change: transform;

  mix-blend-mode: screen;
  @supports (mix-blend-mode: plus-lighter) {
    mix-blend-mode: plus-lighter;
  }
`;

/*
 * Viñeta de legibilidad. A diferencia de Story/Journey (vacío a la
 * izquierda, gradiente `to right`), aquí la figura y los orbes quedan a la
 * IZQUIERDA del encuadre y el vacío a la DERECHA -- el gradiente corre al
 * revés (`to left`) para oscurecer la derecha, donde se superpone el
 * contenido de `Features.tsx`. Tope opaco = MISMO literal que `ScVoid`.
 */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to left,
      ${FEATURES_CELESTIAL_VOID}f2 0%,
      ${FEATURES_CELESTIAL_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${FEATURES_CELESTIAL_VOID}f2 0%,
      ${FEATURES_CELESTIAL_VOID}00 45%
    );
`;
