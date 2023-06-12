/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconUsers: React.FC<IconProps> = ({
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
    <path d="M5.782 19.25h7.436c.565 0 1.009-.468.896-1.021C13.804 16.7 12.79 14 9.5 14s-4.304 2.701-4.615 4.229c-.112.553.332 1.021.897 1.021Z" />
    <path d="M15.75 14c2.079 0 2.93 2.148 3.274 3.696.185.836-.49 1.554-1.347 1.554h-.927" />
    <path d="M9.5 4.75a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 1 0 0-5.5z" />
    <path d="M14.75 10.25c1.519 0 2.5-1.231 2.5-2.75s-.981-2.75-2.5-2.75" />
  </svg>
);

export default IconUsers;
