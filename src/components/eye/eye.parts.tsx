"use client";
import styled, { keyframes } from "styled-components";

/* Silueta de almendra (vesica), en coordenadas objectBoundingBox (0..1): al
   escalarse con el tamano real del socket, el ojo se RE-AJUSTA a cualquier
   viewport en vez de recortarse (spec §14). */
export const ALMOND =
  "M0,0.5 C0.17,0.08 0.4,0.02 0.5,0.02 C0.6,0.02 0.83,0.08 1,0.5 C0.83,0.92 0.6,0.98 0.5,0.98 C0.4,0.98 0.17,0.92 0,0.5 Z";

const spin = keyframes`to { transform: rotate(360deg); }`;
const breathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
`;

export const ScSocket = styled.div`
  position: relative;
  width: min(94vw, 1440px);
  height: min(56vh, 520px);
  margin-inline: auto;
`;

/*
 * Defs de clipPath, ocultos (0x0). El brief original propone
 * `clip-path: path("${ALMOND}")` directamente en CSS, pero el `path()` de
 * `clip-path` interpreta la cadena SVG en px del reference-box (no admite
 * `objectBoundingBox`): con ALMOND en coordenadas 0..1 recortaria el ojo a
 * un cuadrado de ~1px, dejandolo invisible. Reportado en el brief de la
 * tarea; la alternativa que SI soporta objectBoundingBox es un `<clipPath>`
 * SVG referenciado por `url(#id)` -- exactamente lo que hace la referencia
 * original (Cosmic Eye Hero.dc.html), y lo que se usa aqui.
 */
export const ScClipDefs = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
`;

export const ScClip = styled.div<{ $clipId: string }>`
  position: absolute;
  inset: 0;
  clip-path: ${({ $clipId }) => `url(#${$clipId})`};
`;

export const ScUniverse = styled.div`
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 70% 100% at 50% 42%,
      oklch(0.2 0.06 280 / 0.9),
      transparent 62%
    ),
    radial-gradient(
      ellipse 55% 75% at 82% 74%,
      oklch(0.24 0.15 311.928 / 0.5),
      transparent 60%
    ),
    radial-gradient(
      circle at 50% 46%,
      oklch(0.1 0.02 285),
      oklch(0.05 0.012 288) 78%
    );
`;

export const ScEyeball = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
`;

export const ScIris = styled.div`
  position: relative;
  width: min(42vh, 52vw, 460px);
  aspect-ratio: 1;
  will-change: transform;
  animation: ${breathe} 5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ScSwirl = styled.div`
  position: absolute;
  inset: 6%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: conic-gradient(
    from 0deg,
    oklch(0.66 0.142 235.851 / 0),
    oklch(0.66 0.142 235.851 / 0.4),
    oklch(0.66 0.233 311.928 / 0.4),
    oklch(0.66 0.142 235.851 / 0)
  );
  filter: blur(10px);
  animation: ${spin} 34s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ScRing = styled.div<{ $inset: string; $tint: string }>`
  position: absolute;
  inset: ${({ $inset }) => $inset};
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid ${({ $tint }) => $tint};
  animation: ${spin} 22s linear infinite;

  &:nth-of-type(even) {
    animation-direction: reverse;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* La pupila: pozo oscuro que sostiene la marca. Es el "vacio" al que el
   descenso entra (spec §8). */
export const ScPupil = styled.div`
  position: absolute;
  inset: 40%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: radial-gradient(
    circle,
    oklch(0.66 0.142 235.851 / 0.9),
    oklch(0.528 0.259 311.928 / 0.5) 62%,
    transparent 82%
  );
  filter: blur(3px);
`;

export const ScGlint = styled.span<{
  $size: string;
  $top: string;
  $left: string;
}>`
  position: absolute;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: ${({ $size }) => $size};
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: radial-gradient(
    circle,
    oklch(1 0 0) 0%,
    oklch(1 0 0 / 0.6) 40%,
    transparent 72%
  );
  mix-blend-mode: screen;
  pointer-events: none;
  will-change: transform;
`;

/* Sombra del parpado superior: da volumen y evita que el ovalo se lea plano. */
export const ScLidShadow = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, oklch(0.02 0.01 288 / 0.6) 0%, transparent 22%),
    radial-gradient(
      ellipse 120% 55% at 50% -16%,
      oklch(0.02 0.01 288 / 0.6),
      transparent 55%
    );
`;

export const ScOutline = styled.svg`
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
  filter: drop-shadow(0 0 8px oklch(0.72 0.12 250 / 0.45));

  path {
    fill: none;
    stroke: oklch(0.9 0.05 250 / 0.75);
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }
`;
