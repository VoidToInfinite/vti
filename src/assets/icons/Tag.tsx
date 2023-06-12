/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconTag: React.FC<IconProps> = ({
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
    <path
      fill={color}
      stroke="none"
      d="M15 8a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path d="M12 4.75h7.25V12l-6.697 6.67a2 2 0 0 1-2.87-.047L5.29 13.94a2 2 0 0 1 .072-2.81L12 4.75Z" />
  </svg>
);

export default IconTag;
