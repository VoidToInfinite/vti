/* eslint-disable react/jsx-props-no-spreading */
import type { IconProps } from "@/components/featured/Icon/Icon.types";
import React from "react";

const IconBook: React.FC<IconProps> = ({
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
    <path d="M19.25 5.75a1 1 0 0 0-1-1H14a2 2 0 0 0-2 2v12.5l.828-.828a4 4 0 0 1 2.829-1.172h2.593a1 1 0 0 0 1-1V5.75Z" />
    <path d="M4.75 5.75a1 1 0 0 1 1-1H10a2 2 0 0 1 2 2v12.5l-.828-.828a4 4 0 0 0-2.829-1.172H5.75a1 1 0 0 1-1-1V5.75Z" />
  </svg>
);

export default IconBook;
