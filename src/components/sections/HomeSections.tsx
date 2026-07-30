"use client";

import type { ReactElement } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { Contact } from "./Contact/Contact";

/*
 * Gate por seccion (spec 2026-07-29-story-dark-cosmic-heart-design.md, D2):
 * este componente es todo-o-nada solo en CLARO (monta las 4 secciones);
 * en oscuro monta unicamente las secciones que ya tienen tratamiento
 * propio, en el orden en que se van construyendo (encargo del usuario:
 * "vamos a ir seccion por seccion"). Story y Journey ya lo tienen
 * (StoryCosmicHeart, JourneyAstralPathway); Features y Contact todavia no.
 *
 * "use client" + `useTheme()`, sin ThemeProvider anidado: las secciones
 * resuelven contra el tema AMBIENTAL de la pagina, igual que antes.
 *
 * SEO/hidratacion: sin cambios respecto al razonamiento del spec anterior --
 * el export estatico sigue prerenderizando SIEMPRE en claro (`ThemeProvider`
 * arranca en `"light"`), asi que el HTML estatico contiene las 4 secciones;
 * el ajuste de hidratacion a oscuro desmonta Features/Contact pero deja
 * Story/Journey montadas.
 */
export function HomeSections(): ReactElement | null {
  const { themeName } = useTheme();

  if (themeName === "light") {
    return (
      <>
        <Story />
        <Journey />
        <Features />
        <Contact />
      </>
    );
  }

  return (
    <>
      <Story />
      <Journey />
    </>
  );
}
