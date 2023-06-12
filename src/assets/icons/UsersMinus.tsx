/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconUsersMinus: React.FC<IconProps> = ({
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
    <path d="M19.25 17h-3.5" />
    <path d="M11.25 19.25H5.782c-.565 0-1.009-.468-.896-1.021C5.196 16.7 6.21 14 9.5 14c.675 0 1.253.056 1.75.25" />
    <path d="M14.75 10.25c1.519 0 2.5-1.231 2.5-2.75s-.981-2.75-2.5-2.75" />
    <path d="M9.5 10.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" />
  </svg>
);

export default IconUsersMinus;
