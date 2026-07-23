/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "./Icon.types";

const IconTicket: React.FC<IconProps> = ({
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
    <path d="M19.25 6.75a1 1 0 0 0-1-1H5.75a1 1 0 0 0-1 1v1.296c0 .463.328.852.74 1.065a3.25 3.25 0 0 1 0 5.778c-.412.213-.74.602-.74 1.065v1.296a1 1 0 0 0 1 1h12.5a1 1 0 0 0 1-1v-1.296c0-.463-.328-.852-.74-1.065a3.25 3.25 0 0 1 0-5.778c.412-.213.74-.602.74-1.065V6.75Z" />
  </svg>
);

export default IconTicket;
