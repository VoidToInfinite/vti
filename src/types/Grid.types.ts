import Length from "./Length.types";

export interface IGrid {
  alignContent?:
    | "stretch"
    | "center"
    | "flex-start"
    | "flex-end"
    | "baseline"
    | "initial"
    | "inherit";
  justifyItems?:
    | "flex-start"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "stretch"
    | "center"
    | "initial"
    | "inherit";
  alignSelf?: "stretch" | "center" | "start" | "end";
  justifySelf?: "stretch" | "center" | "start" | "end";
  columnGap?: Length;
  gap?: Length;
  gridGap?: Length;
  rowGap?: Length;
  // additional grid properties
  gridAutoFlow?:
    | "row"
    | "column"
    | "dense"
    | "row dense"
    | "column dense"
    | "initial"
    | "inherit";
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridColumnGap?: Length;
  gridRowGap?: Length;
  gridTemplate?: string;
  gridTemplateAreas?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
}
