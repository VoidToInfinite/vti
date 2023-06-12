/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconAtSign: React.FC<IconProps> = ({
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
    <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 1 0 0-6.5z" />
    <path d="M12 19.25a7.25 7.25 0 1 1 0-14.5c6.813 0 7.25 4.375 7.25 7.25v1.25a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2v-4.5" />
  </svg>
);

export default IconAtSign;
