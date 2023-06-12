/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconLink: React.FC<IconProps> = ({
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
    <path d="M16.75 13.25 18 12a4.243 4.243 0 0 0 0-6v0a4.243 4.243 0 0 0-6 0l-1.25 1.25" />
    <path d="M7.25 10.75 6 12a4.243 4.243 0 0 0 0 6v0a4.243 4.243 0 0 0 6 0l1.25-1.25" />
    <path d="m14.25 9.75-4.5 4.5" />
  </svg>
);

export default IconLink;
