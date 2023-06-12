/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconTrendingDown: React.FC<IconProps> = ({
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
    <path d="m19.25 10.25-5.5-5.5" />
    <path d="M17.75 19.25h.5a1 1 0 0 0 1-1v-2.5a1 1 0 0 0-1-1h-.5a1 1 0 0 0-1 1v2.5a1 1 0 0 0 1 1Z" />
    <path d="M11.75 19.25h.5a1 1 0 0 0 1-1v-5.5a1 1 0 0 0-1-1h-.5a1 1 0 0 0-1 1v5.5a1 1 0 0 0 1 1Z" />
    <path d="M5.75 19.25h.5a1 1 0 0 0 1-1V5.75a1 1 0 0 0-1-1h-.5a1 1 0 0 0-1 1v12.5a1 1 0 0 0 1 1Z" />
    <path d="M19.25 6.75v3.5h-3.5" />
  </svg>
);

export default IconTrendingDown;
