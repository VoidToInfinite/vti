"use client";

import React from "react";
import IBrandName from "./BrandName.types";
import ScBrandName from "./BrandName.sc";

// eslint-disable-next-line max-lines-per-function
const BrandName: React.FC<IBrandName> = ({ color }) => (
  <ScBrandName
    width="100%"
    viewBox="0 0 170 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g
      id="gBr4ndVt1"
      strokeLinecap="round"
      fillRule="evenodd"
      fill={color}
    >
      <text
        x="1"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        V
      </text>
      <text
        x="16"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        O
      </text>
      <text
        x="34"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        I
      </text>
      <text
        x="39"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        D
      </text>
      <text
        x="55"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        T
      </text>
      <text
        x="67"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        O
      </text>
      <text
        x="85"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        I
      </text>
      <text
        x="90"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        N
      </text>
      <text
        x="106"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        F
      </text>
      <text
        x="118"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        I
      </text>
      <text
        x="123"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        N
      </text>
      <text
        x="139"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        I
      </text>
      <text
        x="145"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        T
      </text>
      <text
        x="158"
        y="20.5"
        style={{
          fontSize: "1.5rem",
        }}
      >
        E
      </text>
    </g>
  </ScBrandName>
);

export default BrandName;
