/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconWifi: React.FC<IconProps> = ({
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
    <path
      fill={color}
      stroke="none"
      d="M12 17a1 1 0 1 0 0 2 1 1 0 1 0 0-2z"
    />
    <path d="M9.5 14.563a4.231 4.231 0 0 1 2.5-.813c.934 0 1.798.302 2.5.813" />
    <path d="M16.713 11.228A8.212 8.212 0 0 0 12 9.75a8.212 8.212 0 0 0-4.712 1.478" />
    <path d="M5 7.946a12.194 12.194 0 0 1 7-2.196c2.603 0 5.016.812 7 2.196" />
  </svg>
);

export default IconWifi;
