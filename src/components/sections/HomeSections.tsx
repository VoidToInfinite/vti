"use client";

import type { ReactElement } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { Contact } from "./Contact/Contact";

/*
 * Gate por seccion (spec 2026-07-29-story-dark-cosmic-heart-design.md, D2):
 * antes de esta revision, este componente era todo-o-nada (D3 del spec
 * anterior, 2026-07-28) -- claro montaba las 4 secciones, oscuro ninguna.
 * Story ya tiene tratamiento oscuro propio (StoryCosmicHeart); Journey,
 * Features y Contact NO lo tienen todavia -- se construyen uno a uno, en
 * ciclos spec->plan->implementacion separados (encargo del usuario:
 * "vamos a ir seccion por seccion").
 *
 * "use client" + `useTheme()`, sin ThemeProvider anidado: las secciones
 * resuelven contra el tema AMBIENTAL de la pagina, igual que antes.
 *
 * SEO/hidratacion: sin cambios respecto al razonamiento del spec anterior --
 * el export estatico sigue prerenderizando SIEMPRE en claro (`ThemeProvider`
 * arranca en `"light"`), asi que el HTML estatico contiene las 4 secciones;
 * el ajuste de hidratacion a oscuro desmonta Journey/Features/Contact pero
 * ahora deja `Story` montada.
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

  return <Story />;
}
