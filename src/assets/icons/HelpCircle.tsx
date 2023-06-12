/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "@/components/featured/Icon/Icon.types";

const IconHelpCircle: React.FC<IconProps> = ({
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
    <path d="M19.25 12a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" />
    <path d="M9.75 10S10 7.75 12 7.75 14.25 9 14.25 10c0 .751-.423 1.503-1.27 1.83-.515.199-.98.618-.98 1.17v.25" />
    <path d="M12.5 16a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
  </svg>
);

export default IconHelpCircle;
