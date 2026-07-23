/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconEmojiSad: React.FC<IconProps> = ({
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
    <path d="M8.75 4.75h6.5a4 4 0 0 1 4 4v6.5a4 4 0 0 1-4 4h-6.5a4 4 0 0 1-4-4v-6.5a4 4 0 0 1 4-4Z" />
    <path d="M7.75 15.25S9 12.75 12 12.75s4.25 2.5 4.25 2.5" />
    <path
      fill={color}
      stroke="none"
      d="M14 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path
      fill={color}
      stroke="none"
      d="M10 9a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
  </svg>
);

export default IconEmojiSad;
