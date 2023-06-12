/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconAnnotationDots: React.FC<IconProps> = ({
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
    <path d="M4.75 6.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-2.625l-2.625 3-2.625-3H6.75a2 2 0 0 1-2-2v-7.5Z" />
    <path d="M9.5 11a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M12.5 11a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M15.5 11a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
  </svg>
);

export default IconAnnotationDots;
