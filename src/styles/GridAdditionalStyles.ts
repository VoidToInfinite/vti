"use client";

import { css } from "styled-components";
import { IGridAdditional } from "@/types/GridAdditional.types";

const GridAdditionalStyles = css<IGridAdditional>`
  ${({
    gridArea,
    gridColumn,
    gridColumnStart,
    gridColumnEnd,
    gridRow,
    gridRowStart,
    gridRowEnd,
  }) => css`
    ${gridArea &&
    css`
      grid-area: ${gridArea};
    `}
    ${gridColumn &&
    css`
      grid-column: ${gridColumn};
    `}
  ${gridColumnStart &&
    css`
      grid-column-start: ${gridColumnStart};
    `}
  ${gridColumnEnd &&
    css`
      grid-column-end: ${gridColumnEnd};
    `}
  ${gridRow &&
    css`
      grid-row: ${gridRow};
    `}
  ${gridRowStart &&
    css`
      grid-row-start: ${gridRowStart};
    `}
  ${gridRowEnd &&
    css`
      grid-row-end: ${gridRowEnd};
    `}
  `}
`;

export default GridAdditionalStyles;
