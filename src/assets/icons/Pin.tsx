/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconPin: React.FC<IconProps> = ({
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
    <path d="M18.25 11c0 4-6.25 8.25-6.25 8.25S5.75 15 5.75 11c0-3.5 2.936-6.25 6.25-6.25S18.25 7.5 18.25 11Z" />
    <path d="M12 8.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
  </svg>
);

export default IconPin;
