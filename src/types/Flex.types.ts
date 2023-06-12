import Length from "./Length.types";

export interface IFlex {
  alignItems?:
    | "stretch"
    | "center"
    | "flex-start"
    | "flex-end"
    | "baseline"
    | "initial"
    | "inherit";
  justifyContent?:
    | "flex-start"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "stretch"
    | "center"
    | "initial"
    | "inherit";
  flexDirection?: "column" | "row";
  flexWrap?: "wrap" | "nowrap" | "reverse";
  alignSelf?: "stretch" | "center" | "start" | "end";
  justifySelf?: "stretch" | "center" | "start" | "end";
  // additional flex properties
  gap?: Length;
}
