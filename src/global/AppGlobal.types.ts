import React from "react";

export interface AppGlobalProps {
  children?: React.ReactElement | React.ReactNode;
  onClick?: (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => void;
}
