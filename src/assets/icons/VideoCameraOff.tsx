/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconVideoCameraOff: React.FC<IconProps> = ({
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
    <path d="M16 10.207 20 8v8l-4-2.207" />
    <path d="M4.75 4.75 18 20.5" />
    <path d="M6.5 7h-.845C4.741 7 4 7.853 4 8.905v6.19C4 16.147 4.741 17 5.655 17h8.69c.106 0 .21-.012.312-.034" />
    <path d="M14.345 7C15.259 7 16 7.853 16 8.905v4.82" />
  </svg>
);

export default IconVideoCameraOff;
