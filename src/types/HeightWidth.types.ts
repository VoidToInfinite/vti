import Length from "./Length.types";

export interface IHeightWidth {
  // height and width properties
  height?: Length | "auto";
  maxHeight?: Length;
  minHeight?: Length;
  width?: Length | "auto";
  maxWidth?: Length;
  minWidth?: Length;
}
