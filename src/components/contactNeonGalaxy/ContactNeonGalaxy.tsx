"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  CONTACT_NEON_LAYERS,
  CONTACT_NEON_OVERSCAN,
  CONTACT_NEON_POINTER_AMP,
  CONTACT_NEON_SCROLL_AMP,
  CONTACT_NEON_SIZES,
} from "./contactNeonGalaxy.layers";
import { ScLayer, ScScene, ScVignette, ScVoid } from "./contactNeonGalaxy.parts";

/**
 * Fondo a sangre de Contact en tema oscuro: 7 capas WebP con blending
 * aditivo (partición documentada en
 * `assets/contact-neon-galaxy/manifest.json`: 1 fondo + 2 de ambientación +
 * 3 orbes por canal de contacto + figura/holograma), animadas con el mismo
 * hook de parallax que `StoryCosmicHeart`/`JourneyAstralPathway`/
 * `FeaturesCelestialGuide` (`useSceneParallax`). Puramente decorativo
 * (`aria-hidden`): el contenido real vive en `Contact.tsx`, superpuesto a la
 * DERECHA (la figura y los orbes quedan a la izquierda del encuadre, mismo
 * layout que Features).
 */
export function ContactNeonGalaxy(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => CONTACT_NEON_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = CONTACT_NEON_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: CONTACT_NEON_POINTER_AMP,
    scrollAmp: CONTACT_NEON_SCROLL_AMP,
    overscan: CONTACT_NEON_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {CONTACT_NEON_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 2560w`}
          sizes={CONTACT_NEON_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
