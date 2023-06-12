/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconTrash: React.FC<IconProps> = ({
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
    <path d="m6.75 7.75.841 9.673a2 2 0 0 0 1.993 1.827h4.832a2 2 0 0 0 1.993-1.827l.841-9.673" />
    <path d="M9.75 7.5v-.75a2 2 0 0 1 2-2h.5a2 2 0 0 1 2 2v.75" />
    <path d="M5 7.75h14" />
  </svg>
);

export default IconTrash;
