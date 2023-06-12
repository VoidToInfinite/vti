import React from "react";
import { ScOverlay } from "./Overlay.sc";
import type { OverlayProps } from "./Overlay.types";

const Overlay: React.FC<OverlayProps> = ({
  children,
  isVisible = false,
  onClick,
}) => (
  <ScOverlay
    isVisible={isVisible}
    onClick={onClick}
  >
    {children}
  </ScOverlay>
);

export default Overlay;
