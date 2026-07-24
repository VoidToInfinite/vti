import type { ThemeDefinition } from "./theme.types";
import { color } from "./tokens/color";
import { semanticLight, semanticDark } from "./tokens/semantic";
import { type as typeTokens } from "./tokens/type";
import { space } from "./tokens/space";
import { radius } from "./tokens/radius";
import { elevation } from "./tokens/elevation";
import { zIndex } from "./tokens/zIndex";
import { motion } from "./tokens/motion";
import { glassLight, glassDark } from "./tokens/glass";
import { grid } from "./tokens/grid";

const shared = {
  palette: color,
  type: typeTokens,
  space,
  radius,
  elevation,
  zIndex,
  motion,
  grid,
} as const;

export const basicLightTheme: ThemeDefinition = {
  name: "light",
  isLight: true,
  semantic: semanticLight,
  glass: glassLight,
  ...shared,
  breakPoint: {
    sm: "screen and (min-width: 600px)",
    md: "screen and (min-width: 768px)",
    lg: "screen and (min-width: 992px)",
    xl: "screen and (min-width: 1200px)",
  },
};

export const basicDarkTheme: ThemeDefinition = {
  name: "dark",
  isLight: false,
  semantic: semanticDark,
  glass: glassDark,
  ...shared,
  breakPoint: {
    sm: "screen and (min-width: 600px)",
    md: "screen and (min-width: 768px)",
    lg: "screen and (min-width: 992px)",
    xl: "screen and (min-width: 1200px)",
  },
};

export type ThemeName = "light" | "dark";

export const themes: Record<ThemeName, ThemeDefinition> = {
  light: basicLightTheme,
  dark: basicDarkTheme,
};
