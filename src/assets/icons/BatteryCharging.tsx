/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconBatteryChargin: React.FC<IconProps> = ({
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
    <path d="M8.25 6.75h-1.5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h.5" />
    <path d="M14.75 6.75h.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-1.5" />
    <path d="M17.75 10.75H18a1.25 1.25 0 1 1 0 2.5h-.25" />
    <path d="m11.75 6.75-3 5.25h4.5l-3 5.25" />
  </svg>
);

export default IconBatteryChargin;
