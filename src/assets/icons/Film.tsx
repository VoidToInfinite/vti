/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconFilm: React.FC<IconProps> = ({
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
    <path d="M4.75 6.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75Z" />
    <path d="M7.75 5v14" />
    <path d="M16.25 5v14" />
    <path d="M5 8.75h2.5" />
    <path d="M17 8.75h2" />
    <path d="M5 12h14" />
    <path d="M5 15.25h2.5" />
    <path d="M17 15.25h2" />
  </svg>
);

export default IconFilm;
