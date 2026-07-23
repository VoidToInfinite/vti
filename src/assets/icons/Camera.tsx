/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "./Icon.types";

const IconCamera: React.FC<IconProps> = ({
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
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M19.25 17.25v-7.5a2 2 0 0 0-2-2h-.333a1 1 0 0 1-.923-.615l-.738-1.77a1 1 0 0 0-.923-.615H9.667a1 1 0 0 0-.923.615l-.738 1.77a1 1 0 0 1-.923.615H6.75a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2Z" />
    <path d="M15.25 13a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 0 1 6.5 0Z" />
  </svg>
);

export default IconCamera;
