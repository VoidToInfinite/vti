/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconRefresh: React.FC<IconProps> = ({
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
    <path d="M11.25 4.75 8.75 7l2.5 2.25" />
    <path d="m12.75 19.25 2.5-2.25-2.5-2.25" />
    <path d="M9.75 7h3.5a6 6 0 0 1 6 6v.25" />
    <path d="M14.25 17h-3.5a6 6 0 0 1-6-6v-.25" />
  </svg>
);

export default IconRefresh;
