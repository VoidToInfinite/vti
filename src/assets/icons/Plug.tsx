/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPlug: React.FC<IconProps> = ({
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
    <path d="M18.281 12.031 11.97 5.72a1 1 0 0 0-1.596.249L6.75 13 11 17.25l7.032-3.623a1 1 0 0 0 .25-1.596Z" />
    <path d="M4.75 19.25 8.5 15.5" />
    <path d="m13.75 7.25 2.5-2.5" />
    <path d="m16.75 10.25 2.5-2.5" />
  </svg>
);

export default IconPlug;
