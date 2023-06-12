/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "@/components/featured/Icon/Icon.types";

const IconCameraOff: React.FC<IconProps> = ({
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
    <path d="M7.75 7.75h-1a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h10.086c.89 0 1.337-1.077.707-1.707" />
    <path d="M9.75 4.75h4.583a1 1 0 0 1 .923.615l.738 1.77a1 1 0 0 0 .923.615h.333a2 2 0 0 1 2 2v5.5" />
    <path d="M9.923 10.5a3.25 3.25 0 1 0 4.577 4.577" />
    <path d="M17.543 17.543 4.75 4.75" />
  </svg>
);

export default IconCameraOff;
