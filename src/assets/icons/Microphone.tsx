/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconMicrophone: React.FC<IconProps> = ({
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
    <path d="M8.75 8a3.25 3.25 0 0 1 6.5 0v3a3.25 3.25 0 0 1-6.5 0V8Z" />
    <path d="M5.75 12.75s.25 4.5 6.25 4.5 6.25-4.5 6.25-4.5" />
    <path d="M12 17.75v1.5" />
  </svg>
);

export default IconMicrophone;
