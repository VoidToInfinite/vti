import "styled-components";
import type { ThemeDefinition } from "@/theme/theme.types";

declare module "styled-components" {
  export interface DefaultTheme {
    data: ThemeDefinition;
  }
}
