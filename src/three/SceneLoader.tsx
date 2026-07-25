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
import { SceneErrorBoundary } from "./SceneErrorBoundary";

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
    // ausencia de WebGL, o que el módulo no llegue a cargar. Este tercer caso
    // no se resuelve aquí -- el `import()` ya se dispara y si rechaza (red,
    // 404, bloqueador de contenido) lo absorbe `SceneErrorBoundary` más abajo.
    //
    // WebGL se comprueba una sola vez: el hardware no aparece ni desaparece a
    // media sesión. Reduced-motion, en cambio, se reevalúa en caliente --
    // mismo patrón que `usePointer.ts` (busca `addEventListener("change"`)--:
    // suscripción al evento `change` de la media query, no una lectura única
    // de `.matches`. Si el usuario activa la preferencia con la escena ya
    // viva, `live` pasa a `false`, lo que desmonta `<Scene>` y dispara su
    // limpieza (rAF, observers, renderer), que ya es correcta.
    if (!supportsWebGL()) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = (): void => setLive(!reducedQuery.matches);

    evaluate();
    reducedQuery.addEventListener("change", evaluate);
    return () => reducedQuery.removeEventListener("change", evaluate);
  }, []);

  return (
    <ScWrap>
      <ScPoster
        data-testid="scene-poster"
        aria-hidden="true"
      />
      {live && (
        <SceneErrorBoundary>
          <Suspense fallback={null}>
            <Scene progress={progress} />
          </Suspense>
        </SceneErrorBoundary>
      )}
    </ScWrap>
  );
}
