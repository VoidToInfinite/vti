"use client";

import { css } from "styled-components";
import { IFlex } from "@/types/Flex.types";

const FlexStyles = css<IFlex>`
  ${({
    alignItems,
    justifyContent,
    flexDirection,
    flexWrap,
    alignSelf,
    justifySelf,
    gap,
  }) => css`
    ${justifyContent &&
    css`
      justify-content: ${justifyContent};
    `}
    ${alignItems &&
    css`
      align-items: ${alignItems};
    `}
  ${flexDirection &&
    css`
      flex-direction: ${flexDirection};
    `}
  ${flexWrap &&
    css`
      flex-wrap: ${flexWrap};
    `}
  ${alignSelf &&
    css`
      align-self: ${alignSelf};
    `}
  ${justifySelf &&
    css`
      justify-self: ${justifySelf};
    `}
  ${gap &&
    css`
      gap: ${gap};
    `}
  `}
`;

export default FlexStyles;
