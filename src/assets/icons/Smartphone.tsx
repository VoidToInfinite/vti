/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconSmartphone: React.FC<IconProps> = ({
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
    <path d="M4.75 6.75a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2V6.75Z" />
    <path d="M10.25 16.75h-.5" />
    <path d="M18.75 14.25s.5-.906.5-2.25c0-1.344-.5-2.25-.5-2.25" />
  </svg>
);

export default IconSmartphone;
