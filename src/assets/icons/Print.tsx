/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPrint: React.FC<IconProps> = ({
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
    <path d="M4.75 10.75h14.5v6.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-6.5Z" />
    <path d="M6.75 10.5V4.75h10.5v5.75" />
    <path d="M7.75 16.25h8.5" />
  </svg>
);

export default IconPrint;
