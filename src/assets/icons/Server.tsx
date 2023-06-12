/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconServer: React.FC<IconProps> = ({
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
    <path d="M4.75 5.75a1 1 0 0 1 1-1h12.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H5.75a1 1 0 0 1-1-1v-3.5Z" />
    <path d="M4.75 14.75a1 1 0 0 1 1-1h12.5a1 1 0 0 1 1 1v3.5a1 1 0 0 1-1 1H5.75a1 1 0 0 1-1-1v-3.5Z" />
    <path d="M16.25 5v5" />
    <path d="M16.25 14v5" />
  </svg>
);

export default IconServer;
