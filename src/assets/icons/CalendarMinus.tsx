/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconCalendarMinus: React.FC<IconProps> = ({
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
    <path d="M19.25 11.25v-2.5a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h4.5" />
    <path d="M19.25 17h-4.5" />
    <path d="M8 4.75v3.5" />
    <path d="M16 4.75v3.5" />
    <path d="M7.75 10.75h8.5" />
  </svg>
);

export default IconCalendarMinus;
