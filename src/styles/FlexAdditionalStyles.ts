"use client";

import { css } from "styled-components";
import { IFlexAdditional } from "@/types/FlexAdditional.types";

const FlexAdditionalStyles = css<IFlexAdditional>`
  ${({ alignSelf, justifySelf, flex, flexBasis, flexGrow, flexShrink }) => css`
    ${alignSelf &&
    css`
      align-self: ${alignSelf};
    `}
    ${justifySelf &&
    css`
      justify-self: ${justifySelf};
    `}
  /* additional flex properties */
  ${flex &&
    css`
      flex: ${flex};
    `}
  ${flexGrow &&
    css`
      flex-grow: ${flexGrow};
    `}
  ${flexShrink &&
    css`
      flex-shrink: ${flexShrink};
    `}
  ${flexBasis &&
    css`
      flex-basis: ${flexBasis};
    `}
  `}
`;

export default FlexAdditionalStyles;
