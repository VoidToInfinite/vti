/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconBank: React.FC<IconProps> = ({
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
    <path d="M18.25 11.5v7.75m-12.5 0V11.5m4 7.75V11.5m4.5 7.75V11.5" />
    <path d="m12 4.75 7.25 6.5H4.75L12 4.75Z" />
    <path d="M4.75 19.25h14.5" />
  </svg>
);

export default IconBank;
