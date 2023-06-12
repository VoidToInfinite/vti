"use client";

import { css } from "styled-components";
import { IHeightWidth } from "@/types/HeightWidth.types";

const HeightWidthStyles = css<IHeightWidth>`
  ${({ height, maxHeight, minHeight, width, maxWidth, minWidth }) => css`
    ${height &&
    css`
      height: ${height};
    `}
    ${maxHeight &&
    css`
      max-height: ${maxHeight};
    `}
  ${minHeight &&
    css`
      min-height: ${minHeight};
    `}
  ${width &&
    css`
      width: ${width};
    `}
  ${maxWidth &&
    css`
      max-width: ${maxWidth};
    `}
  ${minWidth &&
    css`
      min-width: ${minWidth};
    `}
  `}
`;

export default HeightWidthStyles;
