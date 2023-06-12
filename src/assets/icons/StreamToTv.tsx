/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconStreamToTv: React.FC<IconProps> = ({
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
    <path d="M4.75 8.25v-.5a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-2.5" />
    <path d="M5.5 18a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M8.25 18.25c0-2-1.5-3.5-3.5-3.5" />
    <path d="M11.25 18.25c0-3.714-2.786-6.5-6.5-6.5" />
  </svg>
);

export default IconStreamToTv;
