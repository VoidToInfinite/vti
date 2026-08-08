"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  FEATURES_ORBITAL_LAYERS,
  FEATURES_ORBITAL_OVERSCAN,
  FEATURES_ORBITAL_POINTER_AMP,
  FEATURES_ORBITAL_SCROLL_AMP,
  FEATURES_ORBITAL_SIZES,
} from "./featuresCelestialOrbital.layers";
import {
  ScLayer,
  ScScene,
  ScVignette,
  ScVoid,
} from "./featuresCelestialOrbital.parts";

/**
 * Fondo a sangre de Features en tema oscuro: 7 capas WebP compuestas con
 * alpha NORMAL (partición documentada en el docblock de cabecera de
 * `featuresCelestialOrbital.layers.ts`), animadas con el mismo hook de
 * parallax de puntero + scroll + deriva en reposo que usan
 * `StoryCosmicBeing`/`JourneyCosmicPortal` (`useSceneParallax`, genérico).
 * Sustituye a `FeaturesCelestialGuide`, que era una partición ADITIVA de
 * otro paquete y queda borrada con esta entrega (D12 de la spec).
 *
 * Puramente decorativo (`aria-hidden`): el contenido real de la sección vive
 * en `Features.tsx`, superpuesto encima.
 */
export function FeaturesCelestialOrbital(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => FEATURES_ORBITAL_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = FEATURES_ORBITAL_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: FEATURES_ORBITAL_POINTER_AMP,
    scrollAmp: FEATURES_ORBITAL_SCROLL_AMP,
    overscan: FEATURES_ORBITAL_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {FEATURES_ORBITAL_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 2560w`}
          sizes={FEATURES_ORBITAL_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
