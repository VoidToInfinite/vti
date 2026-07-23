/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconWarningTriangle: React.FC<IconProps> = ({
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
    <path d="m4.952 16.354 5.263-10.497c.738-1.472 2.839-1.472 3.576 0l5.258 10.497a2 2 0 0 1-1.788 2.896H6.741a2 2 0 0 1-1.789-2.896Z" />
    <path d="M12 10v2" />
    <path
      fill={color}
      stroke="none"
      d="M12 15a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
  </svg>
);

export default IconWarningTriangle;
