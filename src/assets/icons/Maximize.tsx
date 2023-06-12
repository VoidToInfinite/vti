/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconMaximize: React.FC<IconProps> = ({
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
    <path d="M4.75 14.75v2.5a2 2 0 0 0 2 2h2.5" />
    <path d="M19.25 14.75v2.5a2 2 0 0 1-2 2h-2.5" />
    <path d="M19.25 9.25v-2.5a2 2 0 0 0-2-2h-2.5" />
    <path d="M4.75 9.25v-2.5a2 2 0 0 1 2-2h2.5" />
  </svg>
);

export default IconMaximize;
