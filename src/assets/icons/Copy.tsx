/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconCopy: React.FC<IconProps> = ({
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
    <path d="M6.5 15.25v0a1.75 1.75 0 0 1-1.75-1.75V6.75a2 2 0 0 1 2-2h6.75c.966 0 1.75.784 1.75 1.75v0" />
    <rect
      width={size}
      height={size}
      x={8.75}
      y={8.75}
      rx={2}
    />
  </svg>
);

export default IconCopy;
