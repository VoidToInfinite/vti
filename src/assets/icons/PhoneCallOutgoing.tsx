/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconPhoneCallOutgoing: React.FC<IconProps> = ({
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
    <path d="M8.893 4.75H6.068c-.728 0-1.318.59-1.318 1.318 0 7.28 5.902 13.182 13.182 13.182.728 0 1.318-.59 1.318-1.318v-2.825l-3.107-2.071-1.611 1.61c-.28.28-.698.368-1.05.186a11.093 11.093 0 0 1-2.518-1.796 8.726 8.726 0 0 1-1.836-2.542c-.16-.34-.067-.733.199-1l1.637-1.637L8.893 4.75Z" />
    <path d="m19.25 4.75-4.5 4.5" />
    <path d="M19.25 8.25v-3.5h-3.5" />
  </svg>
);

export default IconPhoneCallOutgoing;
