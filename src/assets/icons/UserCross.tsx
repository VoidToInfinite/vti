/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconUserCross: React.FC<IconProps> = ({
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
    <path d="M12 4.75a3.25 3.25 0 1 0 0 6.5 3.25 3.25 0 1 0 0-6.5z" />
    <path d="M12.25 19.25h-5.3c-1.18 0-2.06-1.04-1.46-2.055C6.363 15.723 8.24 14 12.25 14" />
    <path d="m19.25 19.25-3.5-3.5" />
    <path d="m15.75 19.25 3.5-3.5" />
  </svg>
);

export default IconUserCross;
