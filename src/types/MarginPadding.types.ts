import Length from "./Length.types";

export interface IMarginPadding {
  // padding and margin properties
  padding?: Length | string;
  margin?: Length | string;
  // auto
  pushDown?: boolean;
  pushLeft?: boolean;
  pushRight?: boolean;
  pushTop?: boolean;
}
