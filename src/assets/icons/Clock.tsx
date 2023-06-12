/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "@/components/featured/Icon/Icon.types";

const IconClock: React.FC<IconProps> = ({
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
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 4.75a7.25 7.25 0 1 0 0 14.5 7.25 7.25 0 1 0 0-14.5z" />
    <path d="M12 8v4l2 2" />
  </svg>
);

export default IconClock;
