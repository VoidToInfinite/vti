/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconFileMinus: React.FC<IconProps> = ({
  size = 46,
  strokeWidth = 1.5,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    fill={props.fill}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12.25 19.25h-4.5a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2H14L18.25 9v4.25" />
    <path d="M19.25 17.25h-3.5" />
    <path d="M18 9.25h-4.25V5" />
  </svg>
);

export default IconFileMinus;
