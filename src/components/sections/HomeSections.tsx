"use client";

import type { ReactElement } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Story } from "./Story/Story";
import { Journey } from "./Journey/Journey";
import { Features } from "./Features/Features";
import { Contact } from "./Contact/Contact";

/*
 * Gate por tema (spec 2026-07-28-landing-v2-secciones-design.md, D3): el
 * encargo del usuario (§1) es "tema claro: secciones completas; tema
 * oscuro: solo hero y footer" -- este componente es el UNICO punto de la
 * pagina que decide eso, para no repartir el condicional entre las 4
 * secciones (Story/Journey/Features/Contact, orden D2) ni duplicarlo en
 * `app/page.tsx`.
 *
 * "use client" + `useTheme()`, sin ThemeProvider anidado nuevo: las
 * secciones resuelven contra el tema AMBIENTAL de la pagina (que ES claro
 * cuando se montan de verdad).
 *
 * Por que esto es seguro para SEO (D3): `ThemeProvider.tsx` arranca SIEMPRE
 * en `"light"` -- no puede leer `localStorage` durante el render sin romper
 * el export estatico (no hay `window` en ese momento) -- y solo se corrige a
 * si mismo en un efecto justo despues de montar (`changeSource:
 * "hydration"`). Eso significa que el HTML prerenderizado del export
 * estatico SIEMPRE contiene las 4 secciones: el rastreador que lee el HTML
 * estatico (sin ejecutar JS) ve exactamente el contenido del mockup, que es
 * la unica version de esta pagina que existe en claro.
 *
 * Que ve el visitante con tema oscuro GUARDADO: el mismo efecto de
 * hidratacion que corrige `themeName` a `"dark"` hace que este componente
 * devuelva `null` en el siguiente render -- las 4 secciones se DESMONTAN
 * (no se ocultan por CSS) justo despues del primer pintado. Es el mismo
 * patron que ya asume el fondo del hero (Aura/Eye, ver
 * `HeroBackdrop.tsx`/`ThemeProvider.tsx`): un ajuste de hidratacion no se
 * anima porque no es un toggle humano, y aqui el "ajuste" es mas radical
 * (desmontar en vez de recolorear) porque estas secciones no tienen
 * contraparte en tema oscuro -- el mockup no las dibuja ahi. A
 * `HomeSections` no le importa POR QUE cambio `themeName`
 * (`changeSource`), solo su valor final: no necesita distinguir "carga con
 * oscuro guardado" de "toggle humano a oscuro" porque el resultado deseado
 * es el mismo en los dos casos (sin secciones).
 */
export function HomeSections(): ReactElement | null {
  const { themeName } = useTheme();

  if (themeName !== "light") return null;

  return (
    <>
      <Story />
      <Journey />
      <Features />
      <Contact />
    </>
  );
}
