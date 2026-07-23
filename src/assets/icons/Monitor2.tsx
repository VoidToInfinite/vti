/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconMonitor2: React.FC<IconProps> = ({
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
    <path d="M9.75 15.25h7.5a2 2 0 0 0 2-2v-6.5a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h3Zm0 0s.25 3-1.75 4h8c-2-1-1.75-4-1.75-4" />
  </svg>
);

export default IconMonitor2;
