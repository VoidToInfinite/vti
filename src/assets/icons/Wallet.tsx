/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconWallet: React.FC<IconProps> = ({
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
    <path d="M19.25 8.25v9a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V6.75" />
    <path d="M16.5 13a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M17.25 8.25H6.5a1.75 1.75 0 1 1 0-3.5h8.75a2 2 0 0 1 2 2v1.5Zm0 0h2" />
  </svg>
);

export default IconWallet;
