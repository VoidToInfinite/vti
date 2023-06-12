import Length from "./Length.types";

export interface IFlexAdditional {
  flex?: string;
  flexBasis?: string | Length;
  flexGrow?: number;
  flexShrink?: number;
  //
  alignSelf?: "stretch" | "center" | "start" | "end";
  justifySelf?: "stretch" | "center" | "start" | "end";
}
