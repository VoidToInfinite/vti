/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPaintbucket: React.FC<IconProps> = ({
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
    <path d="M19.25 7.75H4.75m1 0v9.5a2 2 0 0 0 2 2h8.5a2 2 0 0 0 2-2v-9.5H5.75Z" />
    <path d="M12.25 12.25v-7.5" />
  </svg>
);

export default IconPaintbucket;
