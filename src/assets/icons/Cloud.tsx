/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconCloud: React.FC<IconProps> = ({
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
    <path d="M4.75 14A3.25 3.25 0 0 0 8 17.25h8a3.25 3.25 0 0 0 .243-6.491 4.25 4.25 0 0 0-8.486 0A3.25 3.25 0 0 0 4.75 14Z" />
  </svg>
);

export default IconCloud;
