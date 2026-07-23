/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconLockUnlocked: React.FC<IconProps> = ({
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
    <path d="M5.75 11.75a1 1 0 0 1 1-1h10.5a1 1 0 0 1 1 1v5.5a2 2 0 0 1-2 2h-8.5a2 2 0 0 1-2-2v-5.5Z" />
    <path d="M7.75 10.5v-.657c0-1.228-.05-2.544.674-3.537C9 5.517 10.057 4.75 12 4.75c2 0 3.25 1.5 3.25 1.5" />
  </svg>
);

export default IconLockUnlocked;
