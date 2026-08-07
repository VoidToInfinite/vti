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
  border: color.neutral[100],
  borderStrong: color.neutral[400],
  text: color.neutral[1000],
  textMuted: color.neutral[800],
  // AA (C1): neutral[600] daba 2.98/3.11/2.77 sobre bg/surface/surfaceSunken
  // (falla 4.5:1). neutral[700] (tras bajar L[7] a 0.53 en color.ts) da
  // 5.06/5.28/4.70 — pasa con margen en los tres fondos.
  textSubtle: color.neutral[700],
  brand: color.primary[500],
  // AA (C1): primary[700] daba 4.17:1 onBrand/brandSolid (falla 4.5:1).
  // primary[800] da 5.84:1. Nota: brandText YA era primary[800], así que
  // brandSolid === brandText en valor OKLCH tras este cambio — no es el
  // mismo colapso que textMuted/textSubtle (roles textuales duplicados);
  // aquí son dos roles de USO distinto (fondo de botón sólido vs. color de
  // texto de marca) que simplemente comparten el mismo primitivo. No se
  // buscó un valor alternativo para separarlos artificialmente.
  brandSolid: color.primary[800],
  brandText: color.primary[800],
  // AA (C1): primary[500] daba 2.18:1 focus/bg — fallaba el 3:1 que WCAG
  // 1.4.11/2.4.11 exige al indicador de foco, y afectaba a TODOS los
  // elementos interactivos del sitio. Con primary[700] y L[7] bajado a 0.53
  // da 4.86:1 sobre bg y 5.07:1 sobre surface (medido con ./contrast, no
  // estimado). Las cifras 3.99/4.17 que figuraban aquí eran las de ANTES de
  // bajar L[7]: quedaron obsoletas en el mismo commit que las mejoró.
  focus: color.primary[700],
  onBrand: white,
  // AA (C1): success[700]/warning[700] daban 3.89/4.22:1 sobre bg (fallan
  // 4.5:1); no hay paso intermedio 750. success[800]/warning[800] dan
  // 5.47/5.89:1.
  success: color.success[800],
  warning: color.warning[800],
  error: color.error[700],
};

export const semanticDark: SemanticColors = {
  bg: color.secondary[1100],
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
