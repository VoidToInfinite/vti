/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconHeadphones: React.FC<IconProps> = ({
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
    <path d="M19.25 16v-3.75A7.25 7.25 0 0 0 12 5v0a7.25 7.25 0 0 0-7.25 7.25V16" />
    <path d="M4.75 15.45a2.7 2.7 0 0 1 2.7-2.7v0a1.8 1.8 0 0 1 1.8 1.8v2.9a1.8 1.8 0 0 1-1.8 1.8v0a2.7 2.7 0 0 1-2.7-2.7v-1.1Z" />
    <path d="M14.75 14.55a1.8 1.8 0 0 1 1.8-1.8v0a2.7 2.7 0 0 1 2.7 2.7v1.1a2.7 2.7 0 0 1-2.7 2.7v0a1.8 1.8 0 0 1-1.8-1.8v-2.9Z" />
  </svg>
);

export default IconHeadphones;
