/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPictureInPicture: React.FC<IconProps> = ({
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
    <path d="M7.25 17.25h-.5a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v2.5" />
    <path d="M10.75 13.75a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-4.5Z" />
  </svg>
);

export default IconPictureInPicture;
