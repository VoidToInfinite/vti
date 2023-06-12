import { RefObject } from "react";

interface IScrollSnap {
  propRef?: RefObject<HTMLDivElement>;
  scrollSnapAlign?: string;
  scrollSnapType?: "mandatory" | "x mandatory" | "y mandatory" | string;
  scrollSnapPointsX?: string;
  scrollSnapPointsY?: string;
  overflow?: "hidden" | "visible" | "scroll";
  overflowX?: "hidden" | "visible" | "scroll";
  overflowY?: "hidden" | "visible" | "scroll";
}

interface IScrollSnap {
  children: React.ReactElement | React.ReactElement[];
  propRef?: RefObject<HTMLDivElement>;
}

export default IScrollSnap;
