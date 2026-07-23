/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconShoppingBag: React.FC<IconProps> = ({
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
    <path d="M18.25 7.75H5.75v9l-1 2.5h14.5l-1-2.5v-9Z" />
    <path d="m18.25 7.75-2-3h-8.5l-2 3" />
    <path d="M9.75 10.75v1A2.25 2.25 0 0 0 12 14v0a2.25 2.25 0 0 0 2.25-2.25v-1" />
  </svg>
);

export default IconShoppingBag;
