"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  STORY_COSMIC_BEING_LAYERS,
  STORY_COSMIC_BEING_OVERSCAN,
  STORY_COSMIC_BEING_POINTER_AMP,
  STORY_COSMIC_BEING_SCROLL_AMP,
  STORY_COSMIC_BEING_SIZES,
  storyCosmicBeingAvifSrcSet,
} from "./storyCosmicBeing.layers";
import { ScLayer, ScScene, ScVignette, ScVoid } from "./storyCosmicBeing.parts";

/**
 * Fondo a sangre de Story en tema oscuro: 11 capas WebP (documentadas en
 * assets/story-cosmic-being/manifest.json) -- una base opaca
 * (00-space-base) y diez capas aditivas encima -- animadas con parallax de
 * puntero + scroll + deriva en reposo (useSceneParallax). Sustituye a
 * StoryCosmicHeart (8 capas, obsoleta con esta entrega). Puramente
 * decorativo (aria-hidden): el contenido real de la seccion
 * (kicker/titulo/pilares) vive en Story.tsx, superpuesto encima de esta
 * escena -- mismo criterio que Eye en el hero.
 */
export function StoryCosmicBeing(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Un ref por capa, no un callback-ref con array compartido: mismo patron
  // que Eye.tsx y StoryCosmicHeart.tsx (useMemo con deps [] da identidad
  // estable sin leer .current durante el render, lo que violaria
  // react-hooks/refs).
  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => STORY_COSMIC_BEING_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = STORY_COSMIC_BEING_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: STORY_COSMIC_BEING_POINTER_AMP,
    scrollAmp: STORY_COSMIC_BEING_SCROLL_AMP,
    overscan: STORY_COSMIC_BEING_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {STORY_COSMIC_BEING_LAYERS.map((layer, index) => (
        /*
         * <picture> con pista AVIF (2026-08-17, palanca del dueno para el
         * peso del tema oscuro: -44,5 % medido sobre estas 22 pistas). El
         * envoltorio NO cambia el layout: <picture> no es la caja del <img>
         * -- ScLayer sigue siendo position absolute contra ScScene, y el
         * parallax sigue apuntando al <img> via layerRefs, exactamente igual
         * que antes. El "sizes" viaja IDENTICO en el <source> y en el <img>:
         * si divergieran, el navegador elegiria pistas de anchos distintos
         * segun la rama que gane (misma familia de defecto que la doble
         * descarga de las precargas del hero, eye.layers.ts). Un navegador
         * sin AVIF ignora el <source> por su type y cae al srcSet WebP del
         * <img> -- cero perdida para nadie.
         */
        <picture key={layer.part}>
          <source
            type="image/avif"
            srcSet={storyCosmicBeingAvifSrcSet(layer)}
            sizes={STORY_COSMIC_BEING_SIZES}
          />
          <ScLayer
            ref={layerRefs[index]}
            data-part={layer.part}
            src={layer.src}
            srcSet={`${layer.srcSmall} 1024w, ${layer.src} 1280w`}
            sizes={STORY_COSMIC_BEING_SIZES}
            alt=""
            loading="lazy"
            decoding="async"
            $blend={layer.blend}
            $glow={layer.glow}
          />
        </picture>
      ))}
      <ScVignette />
    </ScScene>
  );
}
