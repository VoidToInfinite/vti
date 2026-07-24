import type { ColorPrimitives } from "./tokens/color";
import type { SemanticColors } from "./tokens/semantic";
import type { space } from "./tokens/space";
import type { radius } from "./tokens/radius";
import type { elevation } from "./tokens/elevation";
import type { zIndex } from "./tokens/zIndex";
import type { motion } from "./tokens/motion";
import type { Glass } from "./tokens/glass";
import type { grid } from "./tokens/grid";

interface BreakPoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

interface Color {
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

interface Typography {
  font: string;
  weight: string;
}

export interface ThemeColor {
  primary: Color;
  secondary: Color;
  tertiary?: Color;
  cta: Color;
  accent: Color;
  success: Color;
  information: Color;
  warning: Color;
  error: Color;
}

export interface ThemeBackgroundColor {
  primary: Color;
  secondary: Color;
}

export interface ThemeTypography {
  main: Typography;
  secondary: Typography;
  primaryColor: Color;
  secondaryColor: Color;
  tertiaryColor: Color;
}

export interface ThemeDefinition {
  // --- nuevo ---
  name: "light" | "dark";
  isLight: boolean;
  palette: ColorPrimitives;
  semantic: SemanticColors;
  type: typeof import("./tokens/type").type;
  space: typeof space;
  radius: typeof radius;
  elevation: typeof elevation;
  glass: Glass;
  motion: typeof motion;
  zIndex: typeof zIndex;
  grid: typeof grid;
  // --- legacy (se elimina en Task 16) ---
  background: ThemeBackgroundColor;
  breakPoint: BreakPoints;
  color: ThemeColor;
  isLightTheme: boolean;
  themeName: string;
  themeTitle: string;
  typography: ThemeTypography;
}
