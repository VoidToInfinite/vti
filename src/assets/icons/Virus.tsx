/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconVirus: React.FC<IconProps> = ({
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
    <path d="M16.25 12a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z" />
    <path d="M10.75 4.75h2.5" />
    <path d="M10.75 19.25h2.5" />
    <path d="M12 5v2.25" />
    <path d="M12 16.75V19" />
    <path d="m16.243 5.99 1.767 1.767" />
    <path d="m5.99 16.243 1.767 1.767" />
    <path d="m16.95 7.05-1.591 1.591" />
    <path d="m8.641 15.359-1.59 1.59" />
    <path d="M19.25 10.75v2.5" />
    <path d="M4.75 10.75v2.5" />
    <path d="M19 12h-2.25" />
    <path d="M7.25 12H5" />
    <path d="m18.01 16.243-1.767 1.767" />
    <path d="M7.757 5.99 5.99 7.757" />
    <path d="m16.95 16.95-1.591-1.591" />
    <path d="m8.641 8.641-1.59-1.59" />
  </svg>
);

export default IconVirus;
