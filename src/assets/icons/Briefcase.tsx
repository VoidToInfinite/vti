/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "@/components/featured/Icon/Icon.types";

const IconBriefcase: React.FC<IconProps> = ({
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
    <path d="M4.75 9.75a2 2 0 0 1 2-2h10.5a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-7.5Z" />
    <path d="M8.75 7.5v-.75a2 2 0 0 1 2-2h2.5a2 2 0 0 1 2 2v.75" />
    <path d="M5 13.25h14" />
    <path d="M8.75 11.75v2.5" />
    <path d="M15.25 11.75v2.5" />
  </svg>
);

export default IconBriefcase;
