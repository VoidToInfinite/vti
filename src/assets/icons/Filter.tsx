/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconFilter: React.FC<IconProps> = ({
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
    <path d="M19.25 4.75H4.75l4.562 5.702a2 2 0 0 1 .438 1.25v6.548a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-6.548a2 2 0 0 1 .438-1.25L19.25 4.75Z" />
  </svg>
);

export default IconFilter;
