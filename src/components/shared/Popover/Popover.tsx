import React, { RefObject } from "react";
import ScPopover from "./Popover.sc";
import IPopover from "./Popover.types";

const Popover: React.FC<IPopover> = ({
  propRef,
  children,
  position,
  top,
  right,
  bottom,
  left,
  isDisplayed = false,
}) => (
  <ScPopover
    ref={propRef as RefObject<HTMLDivElement>}
    position={position}
    top={top}
    right={right}
    bottom={bottom}
    left={left}
    isDisplayed={isDisplayed}
  >
    {children}
  </ScPopover>
);

export default Popover;
