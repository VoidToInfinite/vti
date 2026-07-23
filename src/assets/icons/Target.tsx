/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconTarget: React.FC<IconProps> = ({
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
    <path d="M12 4.75a7.25 7.25 0 1 0 0 14.5 7.25 7.25 0 1 0 0-14.5z" />
    <path d="M12 7.75a4.25 4.25 0 1 0 0 8.5 4.25 4.25 0 1 0 0-8.5z" />
    <path d="M12 10.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 1 0 0-2.5z" />
  </svg>
);

export default IconTarget;
