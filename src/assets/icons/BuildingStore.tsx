/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconBuildingStore: React.FC<IconProps> = ({
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
    <path d="M6.75 19.25h10.5a2 2 0 0 0 2-2V8.183a2 2 0 0 0-.179-.827l-.538-1.184A2 2 0 0 0 16.713 5H7.287a2 2 0 0 0-1.82 1.172L4.93 7.356a2 2 0 0 0-.18.827v9.067a2 2 0 0 0 2 2Z" />
    <path d="M9.5 7.75c0 1.243-1 2.5-2.5 2.5s-2.25-1.257-2.25-2.5" />
    <path d="M19.25 7.75c0 1.243-.75 2.5-2.25 2.5s-2.5-1.257-2.5-2.5" />
    <path d="M14.5 7.75c0 1.243-1 2.5-2.5 2.5s-2.5-1.257-2.5-2.5" />
    <path d="M9.75 15.75a2 2 0 0 1 2-2h.5a2 2 0 0 1 2 2v3.5h-4.5v-3.5Z" />
  </svg>
);

export default IconBuildingStore;
