import type BreakPoints from "@/types/BreakPoint.types";
import type Color from "@/types/Color.types";
import type Typography from "@/types/Typography.types";

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
  background: ThemeBackgroundColor;
  breakPoint: BreakPoints;
  color: ThemeColor;
  isLightTheme: boolean;
  themeName: string;
  themeTitle: string;
  typography: ThemeTypography;
}
