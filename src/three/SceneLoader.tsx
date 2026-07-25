"use client";
import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import styled from "styled-components";

const Scene = lazy(() => import("./Scene").then((m) => ({ default: m.Scene })));

const ScWrap = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: ${({ theme }) => theme.data.zIndex.base};
`;

/*
 * DESVIACIÓN AUTORIZADA (brief de la task 7, paso 6): el póster de fallback
 * NO es un `.webp` capturado del primer frame de la escena -- ese camino está
 * bloqueado en este entorno (el panel de navegador no compone frames de
 * Three.js, no hay forma de capturar nada) -- sino un gradiente CSS puro.
 * Cero bytes de red, cero asset que optimizar, cero dependencia de build, y
 * cumple el mismo propósito real: que nunca se vea un canvas vacío ni se
 * pierda contenido mientras Three.js carga (o si nunca llega a cargar).
 *
 * Excepción sancionada de color (misma familia que `eye.parts.tsx` y
 * `EyeCornerMark.tsx`): los tonos son los mismos literales `oklch()` del ojo
 * -- azul 235.851, violeta 311.928, sobre el fondo oscuro de `ScUniverse` --
 * para que el fundido póster → escena viva (spec §10, en `Scene.tsx`) no dé
 * un salto de color perceptible.
 */
const ScPoster = styled.div`
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
      oklch(0.3 0.18 311.928 / 0.45),
      transparent 60%
    ),
    radial-gradient(
      circle at 50% 46%,
      oklch(0.35 0.142 235.851 / 0.35),
      oklch(0.05 0.012 288) 78%
    );
`;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SceneLoader({
  progress,
}: {
  progress: RefObject<number>;
}): ReactElement {
  const [live, setLive] = useState(false);

  useEffect(() => {
    // Tres motivos para quedarse en el póster (spec §10, §15): reduced-motion,
    // ausencia de WebGL, o que el navegador no llegue a cargar el módulo. En
    // los tres, el sitio está completo igualmente.
    const evaluate = (): void => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduced || !supportsWebGL()) return;
      setLive(true);
    };
    evaluate();
  }, []);

  return (
    <ScWrap>
      <ScPoster
        data-testid="scene-poster"
        aria-hidden="true"
      />
      {live && (
        <Suspense fallback={null}>
          <Scene progress={progress} />
        </Suspense>
      )}
    </ScWrap>
  );
}
