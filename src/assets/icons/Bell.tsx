/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconBell: React.FC<IconProps> = ({
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
    <path d="M17.25 12v-2a5.25 5.25 0 1 0-10.5 0v2l-2 4.25h14.5l-2-4.25Z" />
    <path d="M9 16.75s0 2.5 3 2.5 3-2.5 3-2.5" />
  </svg>
);

export default IconBell;
