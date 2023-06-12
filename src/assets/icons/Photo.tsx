/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPhoto: React.FC<IconProps> = ({
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
    <path d="M6.75 19.25h10.5a2 2 0 0 0 2-2V6.75a2 2 0 0 0-2-2H6.75a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2Z" />
    <path d="m4.75 16 2.746-3.493a2 2 0 0 1 3.09-.067L13 15.25" />
    <path d="M10.915 12.823a601.432 601.432 0 0 0 2.576-3.31 2 2 0 0 1 3.094-.073L19 12.25" />
  </svg>
);

export default IconPhoto;
