import { color } from "./color";

export interface SemanticColors {
  bg: string;
  surface: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  brand: string;
  brandSolid: string;
  brandText: string;
  focus: string;
  onBrand: string;
  success: string;
  warning: string;
  error: string;
}

const white = "oklch(1 0 0)";

export const semanticLight: SemanticColors = {
  bg: color.neutral[50],
  surface: white,
  surfaceSunken: color.neutral[100],
  border: color.neutral[300],
  borderStrong: color.neutral[400],
  text: color.neutral[1000],
  textMuted: color.neutral[800],
  textSubtle: color.neutral[600],
  brand: color.primary[500],
  brandSolid: color.primary[700],
  brandText: color.primary[800],
  focus: color.primary[500],
  onBrand: white,
  success: color.success[700],
  warning: color.warning[700],
  error: color.error[700],
};

export const semanticDark: SemanticColors = {
  bg: color.neutral[1100],
  surface: color.neutral[1000],
  surfaceSunken: color.neutral[1100],
  border: color.neutral[800],
  borderStrong: color.neutral[700],
  text: color.neutral[50],
  textMuted: color.neutral[300],
  textSubtle: color.neutral[400],
  brand: color.primary[400],
  brandSolid: color.primary[500],
  brandText: color.primary[300],
  focus: color.primary[400],
  onBrand: color.neutral[1100],
  success: color.success[500],
  warning: color.warning[500],
  error: color.error[500],
};
