import type { ReactElement } from "react";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { Contact } from "./Contact/Contact";

/*
 * Las 4 secciones ya tienen tratamiento propio para los dos temas
 * (StoryCosmicBeing, JourneyCosmicPortal, FeaturesCelestialOrbital,
 * ContactNeonGalaxy — construidas seccion por seccion, encargo del
 * usuario). El gate por tema que este componente tenia (spec
 * 2026-07-29-story-dark-cosmic-heart-design.md, D2) ya no aporta nada: las
 * 4 se montan siempre, y cada una decide su propia rama claro/oscuro
 * internamente contra `useTheme()` (mismo patron que ya usaban Story.tsx/
 * Journey.tsx/Features.tsx/Contact.tsx antes de esta simplificacion).
 */
export function HomeSections(): ReactElement {
  return (
    <>
      <Story />
      <Journey />
      <Features />
      <Contact />
    </>
  );
}
