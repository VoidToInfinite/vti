/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconHelp: React.FC<IconProps> = ({
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
    <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 1 0 0-6.5z" />
    <path d="m7 17 2.5-2.5" />
    <path d="m17 17-2.5-2.5" />
    <path d="M9.5 9.5 7 7" />
    <path d="M14.5 9.5 17 7" />
  </svg>
);

export default IconHelp;
