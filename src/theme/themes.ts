import type { ThemeDefinition } from "./theme.types";
import { color } from "./tokens/color";
import { semanticLight, semanticDark } from "./tokens/semantic";
import { type as typeTokens } from "./tokens/type";
import { space, inlineSpace } from "./tokens/space";
import { radius } from "./tokens/radius";
import { elevation } from "./tokens/elevation";
import { zIndex } from "./tokens/zIndex";
import { motion } from "./tokens/motion";
import { glassLight, glassDark } from "./tokens/glass";
import { grid } from "./tokens/grid";
import { focusRing } from "./tokens/focus";

/*
 * BREAKPOINTS COMPARTIDOS (crítica externa #14, P3).
 *
 * Hasta el 2026-09-02 este bloque se escribía DOS veces, byte a byte, uno
 * dentro de `basicLightTheme` y otro dentro de `basicDarkTheme`. Nunca fue
 * una decisión: un breakpoint no es piel -- el ancho al que el layout cambia
 * de forma no depende de si el sitio está en claro o en oscuro --, así que
 * pertenece a `shared` como cualquier otro token de sistema.
 *
 * Es una MUDANZA, no un rediseño: los cuatro valores son los mismos. Lo que
 * cambia es que ahora los dos temas comparten la MISMA referencia, así que
 * una divergencia silenciosa entre ramas ya no es representable (candado en
 * `themes.test.ts`, con `toBe`, el mismo criterio que ya ataba `palette`).
 */
const breakPoint = {
  sm: "screen and (min-width: 600px)",
  md: "screen and (min-width: 768px)",
  lg: "screen and (min-width: 992px)",
  xl: "screen and (min-width: 1200px)",
} as const;

const shared = {
  palette: color,
  type: typeTokens,
  space,
  inlineSpace,
  radius,
  elevation,
  zIndex,
  motion,
  grid,
  focusRing,
  breakPoint,
} as const;

export const basicLightTheme: ThemeDefinition = {
  name: "light",
  isLight: true,
  semantic: semanticLight,
  glass: glassLight,
  ...shared,
};

export const basicDarkTheme: ThemeDefinition = {
  name: "dark",
  isLight: false,
  semantic: semanticDark,
  glass: glassDark,
  ...shared,
};

export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, ThemeDefinition> = {
  light: basicLightTheme,
  dark: basicDarkTheme,
};
