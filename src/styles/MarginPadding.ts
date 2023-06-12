"use client";

import { css } from "styled-components";
import { IMarginPadding } from "@/types/MarginPadding.types";

const MarginPaddingStyles = css<IMarginPadding>`
  ${({ margin, padding, pushDown, pushLeft, pushRight, pushTop }) => css`
    ${margin &&
    css`
      margin: ${margin};
    `}
    ${padding &&
    css`
      padding: ${padding};
    `}
  ${pushDown &&
    css`
      margin-top: auto;
    `}
  ${pushTop &&
    css`
      margin-bottom: auto;
    `}
  ${pushLeft &&
    css`
      margin-right: auto;
    `}
  ${pushRight &&
    css`
      margin-left: auto;
    `}
  `}
`;

export default MarginPaddingStyles;
