/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconDotsVertical: React.FC<IconProps> = ({
  color = "currentColor",
  size = 46,
  strokeWidth = 0.5,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    fill={color}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M13 12a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    <path d="M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    <path d="M13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
  </svg>
);

export default IconDotsVertical;
