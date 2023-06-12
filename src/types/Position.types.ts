import Length from "./Length.types";

interface IPosition {
  position?: "absolute" | "relative" | "fixed" | "sticky";
  top?: Length;
  right?: Length;
  bottom?: Length;
  left?: Length;
}

export default IPosition;
