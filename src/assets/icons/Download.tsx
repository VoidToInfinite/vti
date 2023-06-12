/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconDownload: React.FC<IconProps> = ({
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
    <path d="M12 14.25v-9.5" />
    <path d="m8.75 10.75 3.25 3.5 3.25-3.5" />
  </svg>
);

export default IconDownload;
