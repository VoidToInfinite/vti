/* eslint-disable react/jsx-props-no-spreading */
import React from "react";
import type { IconProps } from "@/components/featured/Icon/Icon.types";

const IconMessage: React.FC<IconProps> = ({
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
    <path d="M12 18.25c3.5 0 7.25-1.75 7.25-6.25S15.5 5.75 12 5.75 4.75 7.5 4.75 12c0 1.03.196 1.916.541 2.67.215.47.336.987.24 1.495l-.262 1.399a1 1 0 0 0 1.168 1.167l3.207-.602a2.24 2.24 0 0 1 .764-.003c.527.084 1.062.124 1.592.124Z" />
    <path d="M9.5 12a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M12.5 12a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
    <path d="M15.5 12a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
  </svg>
);

export default IconMessage;
