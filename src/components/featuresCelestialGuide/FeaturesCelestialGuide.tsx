"use client";
import type { ReactElement } from "react";
import styled from "styled-components";

/**
 * Fondo de Features en tema oscuro: una única imagen plana (a diferencia de
 * `StoryCosmicHeart`/`JourneyAstralPathway`, que componen varias capas WebP
 * con blending aditivo) — el paquete entregado para esta sección no traía
 * capas separadas por profundidad, así que no hay parallax que fingir aquí
 * (protocolo de veracidad: sin datos de profundidad reales, no se simula una
 * "profundidad" de una sola capa moviéndose sola). Es un fondo estático,
 * `object-fit: cover`, con la misma viñeta de legibilidad que las otras dos
 * escenas oscuras.
 *
 * La figura y los 6 iconos quedan a la IZQUIERDA del encuadre (al revés que
 * Story/Journey, donde el vacío está a la izquierda y la figura a la
 * derecha): la viñeta y el contenido de `Features.tsx` se posicionan en
 * consecuencia, a la derecha.
 */
const ScScene = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

const ScImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
`;

/* Viñeta de legibilidad: oscurece la mitad DERECHA (donde se superpone el
   contenido) y el borde inferior. Gradiente hacia la izquierda (`to left`),
   al revés que Story/Journey (`to right`), porque aquí el vacío está a la
   derecha. */
const ScVignette = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(to left, oklch(0 0 0 / 0.82) 0%, oklch(0 0 0 / 0) 60%),
    linear-gradient(to top, oklch(0 0 0 / 0.82) 0%, oklch(0 0 0 / 0) 45%);
`;

export function FeaturesCelestialGuide(): ReactElement {
  return (
    <ScScene aria-hidden="true">
      <ScImage
        src="/features/celestial-guide/celestial-guide.webp"
        srcSet="/features/celestial-guide/celestial-guide-1024.webp 1024w, /features/celestial-guide/celestial-guide.webp 2560w"
        sizes="(min-width: 1280px) 1280px, 100vw"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <ScVignette />
    </ScScene>
  );
}
