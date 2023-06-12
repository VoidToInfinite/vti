/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconFolder: React.FC<IconProps> = ({
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
    <path d="M19.25 17.25v-7.5a2 2 0 0 0-2-2H4.75v9.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2Z" />
    <path d="m13.5 7.5-.931-1.708a2 2 0 0 0-1.756-1.042H6.75a2 2 0 0 0-2 2V11" />
  </svg>
);

export default IconFolder;
