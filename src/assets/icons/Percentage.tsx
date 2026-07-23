/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconPercentage: React.FC<IconProps> = ({
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
    <path d="m17.25 6.75-10.5 10.5" />
    <path d="M16 14.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 1 0 0-2.5z" />
    <path d="M8 6.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 1 0 0-2.5z" />
  </svg>
);

export default IconPercentage;
