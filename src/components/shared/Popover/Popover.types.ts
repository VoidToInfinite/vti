import IPosition from "@/types/Position.types";
import { MutableRefObject } from "react";

interface IPopover extends IPosition {
  propRef: MutableRefObject<HTMLElement | null>;
  children: React.ReactNode;
  isDisplayed: boolean;
}

export default IPopover;
