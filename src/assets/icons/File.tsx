/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconFile: React.FC<IconProps> = ({
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
    <path d="M7.75 19.25h8.5a2 2 0 0 0 2-2V9L14 4.75H7.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z" />
    <path d="M18 9.25h-4.25V5" />
  </svg>
);

export default IconFile;
