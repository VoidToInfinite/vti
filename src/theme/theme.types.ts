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

export interface ThemeDefinition {
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
  breakPoint: BreakPoints;
}
