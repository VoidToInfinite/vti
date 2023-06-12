/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconEye: React.FC<IconProps> = ({
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
    <path d="M19.25 12c0 1-1.75 6.25-7.25 6.25S4.75 13 4.75 12 6.5 5.75 12 5.75 19.25 11 19.25 12Z" />
    <path d="M12 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
  </svg>
);

export default IconEye;
