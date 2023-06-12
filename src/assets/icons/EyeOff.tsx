/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconEyeOff: React.FC<IconProps> = ({
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
    <path d="M18.625 10c.44.899.625 1.675.625 2 0 1-1.75 6.25-7.25 6.25a7.621 7.621 0 0 1-2-.256" />
    <path d="M7 16.269C5.362 14.669 4.75 12.59 4.75 12c0-1 1.75-6.25 7.25-6.25 1.795 0 3.19.559 4.256 1.347" />
    <path d="m19.25 4.75-14.5 14.5" />
    <path d="M10.409 13.591a2.25 2.25 0 0 1 3.182-3.182" />
  </svg>
);

export default IconEyeOff;
