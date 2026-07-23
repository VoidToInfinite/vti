/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "./Icon.types";

const IconBox: React.FC<IconProps> = ({
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
    <path d="M4.75 8 12 4.75 19.25 8 12 11.25 4.75 8Z" />
    <path d="M4.75 16 12 19.25 19.25 16" />
    <path d="M19.25 8v8" />
    <path d="M4.75 8v8" />
    <path d="M12 11.5V19" />
  </svg>
);

export default IconBox;
