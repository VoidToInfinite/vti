"use client";
import { useMemo, useRef, type ReactElement, type RefObject } from "react";
import {
  useSceneParallax,
  type SceneParallaxTarget,
} from "@/hooks/useSceneParallax";
import {
  CONTACT_GUARDIAN_LAYERS,
  CONTACT_GUARDIAN_OVERSCAN,
  CONTACT_GUARDIAN_POINTER_AMP,
  CONTACT_GUARDIAN_SCROLL_AMP,
  CONTACT_GUARDIAN_SIZES,
} from "./contactCosmicGuardian.layers";
import {
  ScLayer,
  ScScene,
  ScVignette,
  ScVoid,
} from "./contactCosmicGuardian.parts";

/**
 * Fondo a sangre de Contact en tema oscuro: 3 capas WebP con blending POR
 * CAPA (fondo y figura en alpha normal, polvo estelar en `screen` --
 * particion documentada en `assets/contact-cosmic-guardian/manifest.json`),
 * animadas con el mismo hook de parallax de puntero + scroll + deriva en
 * reposo que usan `StoryCosmicBeing`/`JourneyCosmicPortal`/
 * `FeaturesCelestialOrbital` (`useSceneParallax`, generico). Sustituye a
 * `ContactNeonGalaxy`, que dejaba la figura a la izquierda del encuadre;
 * esta la deja a la DERECHA, asi que el contenido real de la seccion
 * (`Contact.tsx`, superpuesto encima) se muda al lado contrario.
 *
 * Puramente decorativo (`aria-hidden`).
 */
export function ContactCosmicGuardian(): ReactElement {
  const sceneRef = useRef<HTMLDivElement>(null);

  const layerRefs = useMemo<Array<RefObject<HTMLImageElement | null>>>(
    () => CONTACT_GUARDIAN_LAYERS.map(() => ({ current: null })),
    [],
  );

  const targets: SceneParallaxTarget[] = CONTACT_GUARDIAN_LAYERS.map(
    (layer, index) => ({ ref: layerRefs[index], depth: layer.depth }),
  );

  useSceneParallax(sceneRef, targets, {
    pointerAmp: CONTACT_GUARDIAN_POINTER_AMP,
    scrollAmp: CONTACT_GUARDIAN_SCROLL_AMP,
    overscan: CONTACT_GUARDIAN_OVERSCAN,
  });

  return (
    <ScScene
      ref={sceneRef}
      aria-hidden="true"
    >
      <ScVoid />
      {CONTACT_GUARDIAN_LAYERS.map((layer, index) => (
        <ScLayer
          key={layer.part}
          ref={layerRefs[index]}
          data-part={layer.part}
          $blend={layer.blend}
          src={layer.src}
          srcSet={`${layer.srcSmall} 1024w, ${layer.src} 2560w`}
          sizes={CONTACT_GUARDIAN_SIZES}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ))}
      <ScVignette />
    </ScScene>
  );
}
