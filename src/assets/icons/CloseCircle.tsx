/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "./Icon.types";

const IconCloseCircle: React.FC<IconProps> = ({
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
    <path d="M4.75 12A7.25 7.25 0 0 1 12 4.75v0A7.25 7.25 0 0 1 19.25 12v0A7.25 7.25 0 0 1 12 19.25v0A7.25 7.25 0 0 1 4.75 12v0Z" />
    <path d="m9.75 9.75 4.5 4.5" />
    <path d="m14.25 9.75-4.5 4.5" />
  </svg>
);

export default IconCloseCircle;
