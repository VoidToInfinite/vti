"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  FEATURES_CELESTIAL_LAYERS,
  FEATURES_CELESTIAL_OVERSCAN,
  FEATURES_CELESTIAL_POINTER_AMP,
  FEATURES_CELESTIAL_SCROLL_AMP,
  FEATURES_CELESTIAL_SIZES,
} from "./featuresCelestialGuide.layers";
import {
  ScLayer,
  ScScene,
  ScVignette,
  ScVoid,
} from "./featuresCelestialGuide.parts";

/**
 * Fondo a sangre de Features en tema oscuro: 10 capas WebP con blending
 * aditivo (partición documentada en
 * `assets/features-celestial-guide/manifest.json`: 1 fondo + 2 de
 * ambientación + 6 orbes + figura/holograma), animadas con el mismo hook de
 * parallax de puntero + scroll + deriva en reposo que `StoryCosmicBeing`/
 * `JourneyCosmicPortal` (`useSceneParallax`). Sustituye la primera entrega
 * de esta sección (imagen plana única, sin capas — el paquete original no
 * traía parallax). Puramente decorativo (`aria-hidden`): el contenido real
 * vive en `Features.tsx`, superpuesto a la DERECHA (la figura y los orbes
 * quedan a la izquierda del encuadre).
 */
export function FeaturesCelestialGuide(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => FEATURES_CELESTIAL_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = FEATURES_CELESTIAL_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: FEATURES_CELESTIAL_POINTER_AMP,
    scrollAmp: FEATURES_CELESTIAL_SCROLL_AMP,
    overscan: FEATURES_CELESTIAL_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {FEATURES_CELESTIAL_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 2560w`}
          sizes={FEATURES_CELESTIAL_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
