/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconRows: React.FC<IconProps> = ({
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
    <path d="M5.75 10.25h12.5a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1H5.75a1 1 0 0 0-1 1v3.5a1 1 0 0 0 1 1Z" />
    <path d="M5.75 19.25h12.5a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1H5.75a1 1 0 0 0-1 1v3.5a1 1 0 0 0 1 1Z" />
  </svg>
);

export default IconRows;
