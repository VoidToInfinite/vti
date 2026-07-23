/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconMap: React.FC<IconProps> = ({
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
    <path d="m4.75 6.75 4.5-2v12.5l-4.5 2V6.75Z" />
    <path d="m14.75 6.75 4.5-2v12.5l-4.5 2V6.75Z" />
    <path d="m14.75 6.75-5.5-2v12.5l5.5 2V6.75Z" />
  </svg>
);

export default IconMap;
