/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconLogin: React.FC<IconProps> = ({
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
    <path d="m9.75 8.75 3.5 3.25-3.5 3.25" />
    <path d="M9.75 4.75h7.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2h-7.5" />
    <path d="M13 12H4.75" />
  </svg>
);

export default IconLogin;
