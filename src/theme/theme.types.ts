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
  weigth: string;
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
  background: ThemeBackgroundColor;
  breakPoint: BreakPoints;
  color: ThemeColor;
  isLightTheme: boolean;
  themeName: string;
  themeTitle: string;
  typography: ThemeTypography;
}
