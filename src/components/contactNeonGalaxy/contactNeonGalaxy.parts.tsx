"use client";
import styled from "styled-components";
import {
  CONTACT_NEON_OVERSCAN,
  CONTACT_NEON_VOID,
} from "./contactNeonGalaxy.layers";

/* Marco de la escena: `isolation: isolate` la convierte en el grupo de
   blending -- mismo motivo que las otras tres escenas oscuras. */
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
  background-color: ${CONTACT_NEON_VOID};
`;

/* Una capa. Parallax + mix-blend-mode en el MISMO elemento -- mismo motivo
   que las otras tres escenas oscuras. */
export const ScLayer = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
  transform: scale(${CONTACT_NEON_OVERSCAN});
  will-change: transform;

  mix-blend-mode: screen;
  @supports (mix-blend-mode: plus-lighter) {
    mix-blend-mode: plus-lighter;
  }
`;

/* Viñeta de legibilidad: la figura y los orbes quedan a la IZQUIERDA del
   encuadre y el vacío a la DERECHA (mismo layout que Features) -- gradiente
   `to left` para oscurecer la derecha, donde se superpone el contenido de
   `Contact.tsx`. */
export const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      to left,
      ${CONTACT_NEON_VOID}f2 0%,
      ${CONTACT_NEON_VOID}00 60%
    ),
    linear-gradient(
      to top,
      ${CONTACT_NEON_VOID}f2 0%,
      ${CONTACT_NEON_VOID}00 45%
    );
`;
