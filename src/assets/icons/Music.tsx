/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconMusic: React.FC<IconProps> = ({
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
    <path d="M7 14.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
    <path d="M9.25 17V6.75a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2V14" />
    <path d="M17 11.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
  </svg>
);

export default IconMusic;
