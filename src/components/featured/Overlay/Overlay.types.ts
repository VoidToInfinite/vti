import React from "react";

export interface OverlayProps {
  children?: React.ReactNode | React.ReactNode[];
  isVisible: boolean;
  onClick?: () => void;
}
