import React from "react";
import type { IconProps } from "./Icon.types";

const IconVoidToInfinite: React.FC<IconProps> = ({
  color,
  fill,
  size,
  strokeWidth,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 500 550"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <circle
        cx="250"
        cy="75"
        r="50"
        stroke={color}
        fill={fill}
        strokeWidth={strokeWidth}
      />
      <polyline
        stroke={color}
        fill={fill}
        strokeWidth={strokeWidth}
        points="10,75 250,540 490,75 440,75 250,460 60,75 10,75 250,540"
      />
      <polyline
        stroke={color}
        fill={fill}
        strokeWidth={strokeWidth}
        points="110,140 145,210 210,210 250,400 290,210 355,210 390,140 110,140 130,180"
      />
    </g>
  </svg>
);

export default IconVoidToInfinite;
