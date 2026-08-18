"use client";
import type { ReactElement } from "react";
import { useFragmentLanding } from "@/hooks/useFragmentLanding";
import { useTheme } from "@/theme/ThemeProvider";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { About } from "./About/About";
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
 *
 * `"use client"` desde el 2026-08-18 (crítica externa #11, hallazgo A). Este
 * componente era el único de la cadena sin la directiva -- las cinco secciones
 * que monta ya la traen --, así que pasar a cliente no mueve ni un byte al
 * bundle que no estuviera ya ahí; lo que habilita es leer el tema y consumir
 * `useFragmentLanding` (abajo), que necesita un hook.
 *
 * POR QUÉ AQUÍ Y NO EN LA PÁGINA: este componente es el que decide qué rama de
 * tema se monta, y la corrección del aterrizaje en un fragmento existe
 * EXACTAMENTE porque esas dos ramas no miden lo mismo de alto (`DESIGN.md` §4).
 * Las páginas legales no lo necesitan: sin decks no hay divergencia.
 */
export function HomeSections(): ReactElement {
  /* El `themeName` no se usa para pintar nada aquí -- las secciones resuelven
     su propia rama --, sino como SEÑAL de que la rama efectiva ya montó: es la
     dependencia que hace que la corrección del fragmento se arme contra la
     geometría definitiva y no contra la del HTML horneado. Ver el docblock de
     `useFragmentLanding.ts`. */
  const { themeName } = useTheme();
  useFragmentLanding(themeName);

  return (
    <>
      <Story />
      <Journey />
      <Features />
      <Contact />
      {/* `About` es la quinta y la única sin rama por tema: es un bloque de
          hechos citable, no narrativa, y un hecho no cambia según la piel
          (ver su docblock).

          VA DESPUÉS DE CONTACTO, Y NO ENTRE FEATURES Y CONTACTO COMO EN SU
          ENTREGA ORIGINAL (Fase 3, 2026-08-14). El motivo NO es de ritmo
          editorial: es que en la rama oscura ahí era INVISIBLE. Crítica #6
          (2026-08-15), P0-1.

          La rama oscura encadena solapes: cada sección sube 100dvh sobre la
          cola de la anterior (`JOURNEY_OVERLAY_RISE`, `FEATURES_OVERLAY_RISE`,
          `CONTACT_OVERLAY_RISE`, los tres `100dvh`), y Features reserva esa
          cola con un hueco propio (`FEATURES_TAIL_HOLD`, también `100dvh`) que
          Contacto está diseñado para consumir. Medido en el navegador: Contacto
          mide EXACTAMENTE 900 px con `margin-block-start: -900px` a 1280×900,
          así que cubre justo un viewport de lo que tenga delante, y su
          `ScDarkFrame` con el formulario ocupa esa banda entera — no es una
          franja de solo escena.

          About se insertó en medio de esa cadena sin cola propia, así que caía
          entera bajo el solape: `#about` ocupaba 15471→16003 y `#contact`
          15103→16003 con `z-index` 3 contra 2. NO existía posición de scroll en
          la que se viera, ni en escritorio ni en móvil.

          Las tres alternativas y por qué se descartaron:
          - Subir `About` por encima de Contacto con `z-index`: taparía el
            formulario, porque el contenido de Contacto ocupa toda la banda.
          - Darle a `About` su propia cola de 100dvh: funciona, pero añade un
            viewport de scroll vacío a una página que ya arrastra el hallazgo
            de «zonas muertas» de las críticas anteriores.
          - Moverla entre Journey y Features: mueve el bug, no lo arregla —
            Features sube 100dvh sobre esa misma cola.

          Detrás de Contacto no sube nadie (el pie no solapa), que es lo que
          hace de esta la única posición libre que no está en la cabecera. */}
      <About />
    </>
  );
}
