/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconUpload: React.FC<IconProps> = ({
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
    <path d="M4.75 14.75v1.5a3 3 0 0 0 3 3h8.5a3 3 0 0 0 3-3v-1.5" />
    <path d="M12 14.25V5" />
    <path d="M8.75 8.25 12 4.75l3.25 3.5" />
  </svg>
);

export default IconUpload;
