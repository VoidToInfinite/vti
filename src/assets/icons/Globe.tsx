/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconGlobe: React.FC<IconProps> = ({
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
    <path d="M12 4.75a7.25 7.25 0 1 0 0 14.5 7.25 7.25 0 1 0 0-14.5z" />
    <path d="M15.25 12c0 4.5-2.007 7.25-3.25 7.25-1.243 0-3.25-2.75-3.25-7.25S10.757 4.75 12 4.75c1.243 0 3.25 2.75 3.25 7.25Z" />
    <path d="M5 12h14" />
  </svg>
);

export default IconGlobe;
