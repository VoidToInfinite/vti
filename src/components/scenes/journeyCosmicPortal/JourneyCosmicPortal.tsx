"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  JOURNEY_PORTAL_LAYERS,
  JOURNEY_PORTAL_OVERSCAN,
  JOURNEY_PORTAL_POINTER_AMP,
  JOURNEY_PORTAL_SCROLL_AMP,
  JOURNEY_PORTAL_SIZES,
} from "./journeyCosmicPortal.layers";
import {
  ScLayer,
  ScScene,
  ScVignette,
  ScVoid,
} from "./journeyCosmicPortal.parts";

/**
 * Fondo de Journey en tema oscuro: 6 capas WebP compuestas con alpha NORMAL
 * (partición documentada en `assets/journey-cosmic-portal/manifest.json`),
 * animadas con el mismo hook de parallax de puntero + scroll + deriva en
 * reposo que usan `StoryCosmicBeing` y las demás escenas oscuras
 * (`useSceneParallax`, genérico). Sustituye a `JourneyAstralPathway`, que era
 * una partición ADITIVA y queda borrada con esta entrega.
 *
 * Puramente decorativo (`aria-hidden`): el contenido real de la sección vive
 * en `Journey.tsx`, superpuesto encima.
 */
export function JourneyCosmicPortal(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => JOURNEY_PORTAL_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = JOURNEY_PORTAL_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: JOURNEY_PORTAL_POINTER_AMP,
    scrollAmp: JOURNEY_PORTAL_SCROLL_AMP,
    overscan: JOURNEY_PORTAL_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {JOURNEY_PORTAL_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.srcMedium} 1600w, ${layer.src} 2560w`}
          sizes={JOURNEY_PORTAL_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
