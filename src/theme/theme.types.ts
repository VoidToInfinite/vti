import type { ColorPrimitives } from "./tokens/color";
import type { SemanticColors } from "./tokens/semantic";
import type { space, inlineSpace } from "./tokens/space";
import type { radius } from "./tokens/radius";
import type { elevation } from "./tokens/elevation";
import type { zIndex } from "./tokens/zIndex";
import type { motion } from "./tokens/motion";
import type { Glass } from "./tokens/glass";
import type { grid } from "./tokens/grid";
import type { focusRing } from "./tokens/focus";

interface BreakPoints {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeDefinition {
  name: "light" | "dark";
  isLight: boolean;
  palette: ColorPrimitives;
  semantic: SemanticColors;
  type: typeof import("./tokens/type").type;
  space: typeof space;
  /**
   * Relleno del eje inline acotado al viewport: la misma escala que `space`,
   * pero deja de crecer con la raíz tipográfica cuando el viewport es más
   * estrecho que 20rem. Ver `tokens/space.ts`.
   */
  inlineSpace: typeof inlineSpace;
  radius: typeof radius;
  elevation: typeof elevation;
  glass: Glass;
  motion: typeof motion;
  zIndex: typeof zIndex;
  grid: typeof grid;
  /**
   * Geometría del anillo de foco. Vive en el tema (y no solo como import
   * suelto) para que cualquier consumidor futuro lo lea igual que cualquier
   * otro token; hoy su único consumidor es `GlobalStyles.tsx`, que declara el
   * anillo una sola vez para todo el sitio. Ver `tokens/focus.ts`.
   */
  focusRing: typeof focusRing;
  breakPoint: BreakPoints;
}
