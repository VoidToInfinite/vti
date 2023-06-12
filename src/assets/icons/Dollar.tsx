/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import { IconProps } from "@/components/featured/Icon/Icon.types";

const IconDollar: React.FC<IconProps> = ({
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
    <path d="M12 4.75a7.25 7.25 0 1 0 0 14.5 7.25 7.25 0 1 0 0-14.5z" />
    <path d="M14.25 8.75h-2.875c-.898 0-1.625.728-1.625 1.625v0c0 .898.727 1.625 1.625 1.625h1.25c.898 0 1.625.727 1.625 1.625v0c0 .898-.727 1.625-1.625 1.625H9.75" />
    <path d="M12 7.75v.5" />
    <path d="M12 15.75v.5" />
  </svg>
);

export default IconDollar;
