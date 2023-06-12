/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconInformation: React.FC<IconProps> = ({
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
    <path d="M12 13v2" />
    <path
      fill={color}
      stroke="none"
      d="M12 8a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path d="M12 4.75a7.25 7.25 0 1 0 0 14.5 7.25 7.25 0 1 0 0-14.5z" />
  </svg>
);

export default IconInformation;
