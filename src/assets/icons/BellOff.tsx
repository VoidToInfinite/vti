/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconBellOff: React.FC<IconProps> = ({
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
    <path d="M17.25 6.875V12l2 4.25H7.75m-2-2.125 1-2.125v-2c0-2.9 2.35-5.25 5.25-5.25 0 0 1.61 0 2.594.5" />
    <path d="M9 16.75s0 2.5 3 2.5 3-2.5 3-2.5" />
    <path d="m19.25 4.75-14.5 14.5" />
  </svg>
);

export default IconBellOff;
