"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  STORY_COSMIC_HEART_LAYERS,
  STORY_COSMIC_HEART_OVERSCAN,
  STORY_COSMIC_HEART_POINTER_AMP,
  STORY_COSMIC_HEART_SCROLL_AMP,
  STORY_COSMIC_HEART_SIZES,
} from "./storyCosmicHeart.layers";
import { ScLayer, ScScene, ScVignette, ScVoid } from "./storyCosmicHeart.parts";

/**
 * Fondo a sangre de Story en tema oscuro: 8 capas WebP con blending aditivo
 * (particion documentada en `assets/story-cosmic-heart/manifest.json`),
 * animadas con parallax de puntero + scroll + deriva en reposo
 * (`useSceneParallax`). Puramente decorativo (`aria-hidden`): el contenido
 * real de la seccion (kicker/titulo/pilares) vive en `Story.tsx`, superpuesto
 * encima de esta escena -- mismo criterio que `Eye` en el hero.
 */
export function StoryCosmicHeart(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Un ref por capa, no un callback-ref con array compartido: mismo patron
  // que `Eye.tsx` (useMemo con deps `[]` da identidad estable sin leer
  // `.current` durante el render, lo que violaria `react-hooks/refs`).
  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => STORY_COSMIC_HEART_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = STORY_COSMIC_HEART_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: STORY_COSMIC_HEART_POINTER_AMP,
    scrollAmp: STORY_COSMIC_HEART_SCROLL_AMP,
    overscan: STORY_COSMIC_HEART_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {STORY_COSMIC_HEART_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1672w`}
          sizes={STORY_COSMIC_HEART_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
          $glow={layer.glow}
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
