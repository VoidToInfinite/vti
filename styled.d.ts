import "styled-components";
import type { ThemeDefinition } from "@/themes/Theme.types";

declare module "styled-components" {
  export interface DefaultTheme {
    data: ThemeDefinition;
  }
}
