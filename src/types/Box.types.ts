import { IFlexAdditional } from "./FlexAdditional.types";
import { IGridAdditional } from "./GridAdditional.types";

export interface IBox extends IFlexAdditional, IGridAdditional {
  overflow?:
    | "auto"
    | "hidden"
    | "inherit"
    | "initial"
    | "visible"
    | "overlay"
    | "revert"
    | "scroll";
  zIndex?: number;
}
