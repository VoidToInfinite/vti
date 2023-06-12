"use client";

import styled, { css } from "styled-components";
import MarginPaddingStyles from "@/styles/MarginPadding";
import HeightWidthStyles from "@/styles/HeightWidthStyles";
import FlexAdditionalStyles from "@/styles/FlexAdditionalStyles";
import GridAdditionalStyles from "@/styles/GridAdditionalStyles";
import BoxProps from "./Box.types";

const ScBox = styled.div<BoxProps>`
  ${({ backgroundColor, overflow, zIndex }) => css`
    /* margin and padding properties */
    ${MarginPaddingStyles}
    /* height and width properties */
    ${HeightWidthStyles}
    ${backgroundColor &&
    css`
      background-color: ${backgroundColor};
    `}
    /* additional flex properties */
    ${FlexAdditionalStyles}
    /* additional grid properties */
    ${GridAdditionalStyles}

    overflow: ${overflow ?? "hidden"};
    z-index: ${zIndex ?? "0"};
  `}
`;

export default ScBox;
