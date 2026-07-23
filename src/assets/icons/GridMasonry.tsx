/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconGridMansonry: React.FC<IconProps> = ({
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
    <path d="M5.75 19.25h3.5a1 1 0 0 0 1-1V5.75a1 1 0 0 0-1-1h-3.5a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1Z" />
    <path d="M14.75 10.25h3.5a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1h-3.5a1 1 0 0 0-1 1v3.5a1 1 0 0 0 1 1Z" />
    <path d="M14.75 19.25h3.5a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1h-3.5a1 1 0 0 0-1 1v3.5a1 1 0 0 0 1 1Z" />
  </svg>
);

export default IconGridMansonry;
