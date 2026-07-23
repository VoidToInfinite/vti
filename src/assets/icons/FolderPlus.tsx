/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconFolderPlus: React.FC<IconProps> = ({
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
    <path d="M12.25 19.25h-5.5a2 2 0 0 1-2-2v-9.5h12.5a2 2 0 0 1 2 2v2.5" />
    <path d="m13.5 7.5-.931-1.708a2 2 0 0 0-1.756-1.042H6.75a2 2 0 0 0-2 2V11" />
    <path d="M17 14.75v4.5" />
    <path d="M19.25 17h-4.5" />
  </svg>
);

export default IconFolderPlus;
