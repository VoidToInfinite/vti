/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconPinTack: React.FC<IconProps> = ({
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
    <path d="m8.75 7.75-1-3h8.5l-1 3V10c3 1 3 4.25 3 4.25H5.75s0-3.25 3-4.25V7.75Z" />
    <path d="M12 14.5v4.75" />
  </svg>
);

export default IconPinTack;
