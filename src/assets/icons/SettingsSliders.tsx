/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconSettingsSliders: React.FC<IconProps> = ({
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
    <path d="M4.75 8h2.5" />
    <path d="M12.75 8h6.5" />
    <path d="M4.75 16h7.5" />
    <path d="M17.75 16h1.5" />
    <path d="M10 5.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
    <path d="M15 13.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 1 0 0-4.5z" />
  </svg>
);

export default IconSettingsSliders;
