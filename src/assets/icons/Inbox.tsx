/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconInbox: React.FC<IconProps> = ({
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
    <path d="M19.25 11.75 17.664 6.2a2 2 0 0 0-1.923-1.45H8.26A2 2 0 0 0 6.336 6.2L4.75 11.75" />
    <path d="M10.214 12.369c-.258-.336-.62-.619-1.043-.619H4.75v5.5a2 2 0 0 0 2 2h10.5a2 2 0 0 0 2-2v-5.5h-4.42c-.425 0-.786.283-1.044.619A2.246 2.246 0 0 1 12 13.25a2.246 2.246 0 0 1-1.786-.881Z" />
  </svg>
);

export default IconInbox;
