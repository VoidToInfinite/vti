/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconBuilding: React.FC<IconProps> = ({
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
    <path d="M5.75 6.75a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v12.5H5.75V6.75Z" />
    <path d="M19.25 19.25H4.75" />
    <path d="M9.75 15.75a2 2 0 0 1 2-2h.5a2 2 0 0 1 2 2v3.5h-4.5v-3.5Z" />
    <path
      fill={color}
      stroke="none"
      d="M10 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path
      fill={color}
      stroke="none"
      d="M14 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
  </svg>
);

export default IconBuilding;
