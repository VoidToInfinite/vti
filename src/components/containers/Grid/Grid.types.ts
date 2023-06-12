import { IGrid } from "@/types/Grid.types";
import BoxProps from "../Box/Box.types";

export interface GridProps extends BoxProps, IGrid {
  // grid properties
  container: boolean;
}
