/* eslint-disable react/jsx-props-no-spreading */
import type { IconProps } from "@/components/featured/Icon/Icon.types";
import React from "react";

const IconBookmark: React.FC<IconProps> = ({
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
    <path d="M6.75 6.75a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v12.5L12 14.75l-5.25 4.5V6.75Z" />
  </svg>
);

export default IconBookmark;
