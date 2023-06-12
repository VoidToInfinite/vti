/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconProjector: React.FC<IconProps> = ({
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
    <path d="M18.25 7.75H5.75v7.5a2 2 0 0 0 2 2h8.5a2 2 0 0 0 2-2v-7.5Z" />
    <path d="M18.25 4.75H5.75a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h12.5a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1Z" />
    <path d="M12 17.5v1.75" />
  </svg>
);

export default IconProjector;
