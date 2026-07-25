"use client";
import type { ReactElement } from "react";
import styled, { css, keyframes } from "styled-components";

/*
 * Wormhole — portado desde `vti-sdk` (`src/widgets/landing-fx/Wormhole.tsx` +
 * `Wormhole.css.ts`), la construccion de anillos que es el motivo visual
 * recurrente de aquella landing. Aqui vive en el centro del ojo del hero.
 *
 * POR QUE UN PORT Y NO UNA DEPENDENCIA: `vti-sdk` no publica paquete (es una
 * SPA, `version: 0.1.0`, sin build de libreria) y sus estilos son
 * vanilla-extract, que necesita un loader de webpack; este repo compila con
 * Turbopack y viste con styled-components. Traer vanilla-extract aqui seria
 * cambiar el compilador del proyecto para una pieza decorativa.
 *
 * QUE CAMBIA RESPECTO AL ORIGINAL:
 * - Se descarta el `root` de origen entero (posicion fija, docking por scroll
 *   con `data-dock`, `--dx/--dy/--scale/--op`): aqui no hay viaje de anclaje,
 *   el mascota se coloca en la pupila y punto. Lo pone el contenedor de `Eye`.
 * - Solo se portan los valores de color de tema OSCURO. El original alterna
 *   con `[data-theme="dark"] &` porque alli vive en los dos temas; aqui el
 *   Wormhole SOLO se monta en oscuro (en claro se monta `Sol`), asi que la
 *   rama clara seria codigo muerto. Mismo criterio que sigue `Sol.css.ts` en
 *   origen, que no tiene rama oscura por el motivo simetrico.
 * - `easingEmphasized` pasa a leer el token de ESTE sistema
 *   (`motion.easing.emphasized`), no la curva del sdk: el repo manda sobre el
 *   origen en lo que es un rol del sistema de movimiento.
 *
 * Excepcion de color sancionada, la misma que rige `eye.parts.tsx` y
 * `BackOrbs.tsx`: los `oklch()` literales son espectaculo de marca en un
 * elemento `aria-hidden`, no roles de UI. Aqui ademas son la traduccion
 * exacta de los pasos de escala que el handoff de diseno del sdk fijo.
 */

function oklch(triplet: string, alpha: number): string {
  return `oklch(${triplet} / ${alpha})`;
}

const RING_1 = "0.66 0.142 235.851"; // primary-500
const RING_2 = "0.66 0.233 311.928"; // secondary-500
const RING_3 = "0.8 0.117 235.851"; // primary-300
const RING_4 = "0.73 0.195 311.928"; // secondary-400
const CORE_START = "0.66 0.142 235.851"; // primary-500
const CORE_END = "0.528 0.259 311.928"; // secondary-700

/* La animacion continua se condiciona a `no-preference` en vez de apoyarse en
   el colapso global de duraciones de `GlobalStyles`: colapsar la duracion de
   una animacion INFINITA no la para, la hace girar instantaneamente para
   siempre. Convencion heredada del origen. */
const MOTION_OK = "(prefers-reduced-motion: no-preference)";

const spin = keyframes`to { transform: rotate(360deg); }`;

const swirlFlash = keyframes`
  0% { filter: brightness(1) blur(10px); }
  15% { filter: brightness(1.6) blur(6px); }
  100% { filter: brightness(1) blur(10px); }
`;

const ringGlowStep = keyframes`
  0% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
  9% { filter: brightness(1.75); box-shadow: 0 0 22px 1px var(--ring-glow); }
  44% { filter: brightness(1.75); box-shadow: 0 0 22px 1px var(--ring-glow); }
  50% { filter: brightness(2.5); box-shadow: 0 0 36px 3px var(--ring-glow-strong); }
  78% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
  100% { filter: brightness(1); box-shadow: 0 0 0 0 transparent; }
`;

const ringExplodeStep = keyframes`
  0% { filter: brightness(1); transform: scale(1); }
  15% { filter: brightness(2.6); transform: scale(1.08); }
  100% { filter: brightness(1); transform: scale(1); }
`;

const corePulseStep = keyframes`
  0% { transform: scale(1); filter: blur(3px) brightness(1); }
  15% { transform: scale(1.3); filter: blur(1px) brightness(2.1); }
  100% { transform: scale(1); filter: blur(3px) brightness(1); }
`;

const shockBurst = keyframes`
  0% {
    transform: scale(0.82);
    opacity: 0;
    filter: blur(0px);
    border-width: 3px;
  }
  10% { opacity: 0.9; border-width: 3px; }
  100% {
    transform: scale(var(--shock-scale-end));
    opacity: 0;
    filter: blur(var(--shock-blur-end));
    border-width: 1px;
  }
`;

const ScRoot = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const ScSwirl = styled.div`
  position: absolute;
  inset: 6%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  opacity: 0.85;
  filter: blur(10px);
  background-image: conic-gradient(
    from 0deg,
    ${oklch(RING_1, 0)},
    ${oklch(RING_1, 0.4)},
    ${oklch(RING_2, 0.4)},
    ${oklch(RING_1, 0)}
  );

  @media ${MOTION_OK} {
    animation: ${spin} 34s linear infinite;

    [data-pulse="true"] & {
      animation:
        ${spin} 34s linear infinite,
        ${swirlFlash} 850ms ${({ theme }) => theme.data.motion.easing.standard}
          1150ms;
    }
  }
`;

const ringBase = css`
  position: absolute;
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 1px solid transparent;
`;

const ScRing1 = styled.div`
  ${ringBase}
  inset: 0;
  border-color: ${oklch(RING_1, 0.5)};
  box-shadow: 0 0 50px ${oklch(RING_1, 0.2)};
  --ring-glow-strong: ${oklch(RING_1, 0.95)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${ringExplodeStep} 850ms
        ${({ theme }) => theme.data.motion.easing.standard} 1150ms;
    }
  }
`;

const ScRing2 = styled.div`
  ${ringBase}
  inset: 10%;
  border-color: ${oklch(RING_2, 0.45)};
  --ring-glow: ${oklch(RING_2, 0.7)};
  --ring-glow-strong: ${oklch(RING_2, 0.95)};

  @media ${MOTION_OK} {
    animation: ${spin} 24s linear infinite reverse;

    [data-pulse="true"] & {
      animation:
        ${spin} 24s linear infinite reverse,
        ${ringGlowStep} 1680ms
          ${({ theme }) => theme.data.motion.easing.standard} 320ms;
    }
  }
`;

const ScRing3 = styled.div`
  ${ringBase}
  inset: 21%;
  border-color: ${oklch(RING_3, 0.4)};
  --ring-glow: ${oklch(RING_3, 0.7)};
  --ring-glow-strong: ${oklch(RING_3, 0.95)};

  @media ${MOTION_OK} {
    animation: ${spin} 18s linear infinite;

    [data-pulse="true"] & {
      animation:
        ${spin} 18s linear infinite,
        ${ringGlowStep} 1840ms
          ${({ theme }) => theme.data.motion.easing.standard} 160ms;
    }
  }
`;

const ScRing4 = styled.div`
  ${ringBase}
  inset: 33%;
  border-color: ${oklch(RING_4, 0.5)};
  --ring-glow: ${oklch(RING_4, 0.7)};
  --ring-glow-strong: ${oklch(RING_4, 0.95)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${ringGlowStep} 2000ms
        ${({ theme }) => theme.data.motion.easing.standard} 0ms;
    }
  }
`;

const ScCore = styled.div`
  position: absolute;
  inset: 40%;
  border-radius: ${({ theme }) => theme.data.radius.full};
  filter: blur(3px);
  background-image: radial-gradient(
    circle,
    ${oklch(CORE_START, 0.9)},
    ${oklch(CORE_END, 0.5)} 62%,
    transparent 82%
  );

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${corePulseStep} 850ms
        ${({ theme }) => theme.data.motion.easing.standard} 1150ms;
    }
  }
`;

const shockBase = css`
  position: absolute;
  inset: 0;
  border-radius: ${({ theme }) => theme.data.radius.full};
  border: 2px solid transparent;
  opacity: 0;
  pointer-events: none;
  --shock-scale-end: 2.05;
  --shock-blur-end: 11px;
`;

const ScShock1 = styled.div`
  ${shockBase}
  border-color: ${oklch(RING_1, 0.85)};

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${shockBurst} 900ms
        ${({ theme }) => theme.data.motion.easing.emphasized} 1200ms;
    }
  }
`;

/* La ultima onda en apagarse (1300ms de retardo + 860ms) es la que marca el
   final del pulso completo: su `animationend` es el que devuelve el estado a
   reposo en `Eye`, y por eso es la unica que lleva el handler. */
const ScShock2 = styled.div`
  ${shockBase}
  border-color: ${oklch(RING_2, 0.8)};
  --shock-scale-end: 2.32;
  --shock-blur-end: 15px;

  @media ${MOTION_OK} {
    [data-pulse="true"] & {
      animation: ${shockBurst} 860ms
        ${({ theme }) => theme.data.motion.easing.emphasized} 1300ms;
    }
  }
`;

export interface WormholeProps {
  /** Dispara la coreografia de pulso (destello, anillos, ondas). */
  pulsing: boolean;
  /** Se invoca cuando la ULTIMA onda termina, no la primera. */
  onPulseEnd?: () => void;
  className?: string;
}

export function Wormhole({
  pulsing,
  onPulseEnd,
  className,
}: WormholeProps): ReactElement {
  return (
    <ScRoot
      className={className}
      data-pulse={pulsing ? "true" : "false"}
      aria-hidden="true"
    >
      <ScSwirl data-part="swirl" />
      <ScRing1 data-part="ring1" />
      <ScRing2 data-part="ring2" />
      <ScRing3 data-part="ring3" />
      <ScRing4 data-part="ring4" />
      <ScCore data-part="core" />
      <ScShock1 data-part="shock1" />
      <ScShock2
        data-part="shock2"
        onAnimationEnd={onPulseEnd}
      />
    </ScRoot>
  );
}
