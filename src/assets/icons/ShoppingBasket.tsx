/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconShoppingBasket: React.FC<IconProps> = ({
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
    <path d="M16.584 17.662 18.25 9.75H5.75l1.666 7.912a2 2 0 0 0 1.957 1.588h5.254a2 2 0 0 0 1.957-1.588Z" />
    <path d="M8.75 9.5V7.75a3 3 0 0 1 3-3h.5a3 3 0 0 1 3 3V9.5" />
    <path d="M19.25 9.75H4.75" />
  </svg>
);

export default IconShoppingBasket;
