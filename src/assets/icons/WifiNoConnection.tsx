/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconWifiNoConnection: React.FC<IconProps> = ({
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
      d="M12 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
    />
    <path d="M9.5 14.563a4.231 4.231 0 0 1 2.5-.813c.934 0 1.798.302 2.5.813" />
    <path d="M16.713 11.228a8.213 8.213 0 0 0-2.533-1.187" />
    <path d="M7.288 11.228a8.206 8.206 0 0 1 3.058-1.312" />
    <path d="M4.75 8.25C6.734 6.866 9 5.75 12 5.75c.688 0 1.336.059 1.952.166" />
    <path d="M19.25 8.25a17.161 17.161 0 0 0-1.915-1.172" />
    <path d="m18.25 5.75-11.5 11.5" />
  </svg>
);

export default IconWifiNoConnection;
