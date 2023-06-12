/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconBatteryLow: React.FC<IconProps> = ({
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
    <path d="M4.75 8.75a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-6.5Z" />
    <path d="M7.75 9.75v4.5" />
    <path d="M17.75 10.75H18c.69 0 1.25.56 1.25 1.25v0c0 .69-.56 1.25-1.25 1.25h-.25" />
  </svg>
);

export default IconBatteryLow;
