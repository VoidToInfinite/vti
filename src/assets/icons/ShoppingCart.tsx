/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconShoppingCart: React.FC<IconProps> = ({
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
    <path d="M7.75 7.75h11.5l-1.637 6.958a2 2 0 0 1-1.947 1.542h-4.127a2 2 0 0 1-1.933-1.488L7.75 7.75Zm0 0-.75-3H4.75" />
    <path
      fill={color}
      stroke="none"
      d="M10 18a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path
      fill={color}
      stroke="none"
      d="M17 18a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
  </svg>
);

export default IconShoppingCart;
