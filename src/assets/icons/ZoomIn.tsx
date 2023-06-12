/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconZoomIn: React.FC<IconProps> = ({
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
    <path d="M11 4.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 1 0 0-12.5z" />
    <path d="m15.5 15.5 3.75 3.75" />
    <path d="M11 8.75v4.5" />
    <path d="M13.25 11h-4.5" />
  </svg>
);

export default IconZoomIn;
