"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  JOURNEY_ASTRAL_LAYERS,
  JOURNEY_ASTRAL_OVERSCAN,
  JOURNEY_ASTRAL_POINTER_AMP,
  JOURNEY_ASTRAL_SCROLL_AMP,
  JOURNEY_ASTRAL_SIZES,
} from "./journeyAstralPathway.layers";
import { ScLayer, ScScene, ScVignette, ScVoid } from "./journeyAstralPathway.parts";

/**
 * Fondo a sangre de Journey en tema oscuro: 5 capas WebP con blending
 * aditivo (partición documentada en
 * `assets/journey-astral-pathway/manifest.json`), animadas con el mismo
 * hook de parallax de puntero + scroll + deriva en reposo que usa
 * `StoryCosmicHeart` (`useSceneParallax`, `@/hooks/useSceneParallax` —
 * genérico, no específico de Story). Puramente decorativo (`aria-hidden`):
 * el contenido real de la sección vive en `Journey.tsx`, superpuesto encima.
 */
export function JourneyAstralPathway(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => JOURNEY_ASTRAL_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = JOURNEY_ASTRAL_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: JOURNEY_ASTRAL_POINTER_AMP,
    scrollAmp: JOURNEY_ASTRAL_SCROLL_AMP,
    overscan: JOURNEY_ASTRAL_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {JOURNEY_ASTRAL_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 2560w`}
          sizes={JOURNEY_ASTRAL_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
