"use client";

/* eslint-disable complexity */
import { IGrid } from "@/types/Grid.types";
import { css } from "styled-components";

const GridStyles = css<IGrid>`
  ${({
    alignContent,
    justifyItems,
    columnGap,
    rowGap,
    gap,
    gridGap,
    gridAutoFlow,
    gridAutoColumns,
    gridAutoRows,
    gridColumnGap,
    gridRowGap,
    gridTemplate,
    gridTemplateAreas,
    gridTemplateColumns,
    gridTemplateRows,
  }) => css`
    align-content: ${alignContent ?? "start"};
    justify-items: ${justifyItems ?? "start"};

    ${gap &&
    css`
      gap: ${gap};
    `}
    grid-auto-flow: ${gridAutoFlow ?? "dense"};
    ${gridAutoColumns &&
    css`
      grid-auto-columns: ${gridAutoColumns};
    `}
    ${gridAutoRows &&
    css`
      grid-auto-rows: ${gridAutoRows};
    `}
  ${gridGap &&
    css`
      grid-gap: ${gridGap};
    `}
  ${gridColumnGap &&
    css`
      grid-column-gap: ${gridColumnGap};
    `}
  ${gridRowGap &&
    css`
      grid-row-gap: ${gridRowGap};
    `}
  ${gridTemplate &&
    css`
      grid-template: ${gridTemplate};
    `}
  ${gridTemplateAreas &&
    css`
      grid-template-areas: ${gridTemplateAreas};
    `}
  grid-template-columns: ${gridTemplateColumns ??
    `repeat(
    auto-fill,
    minmax(
      clamp(
        clamp(
          clamp(
            clamp(
              100%/ (var(--laptop) + 1) + 0.1%,
              (var(--bp3) - 100vw) * 1000,
              100%/ (var(--tablet) + 1) + 0.1%
            ),
            (var(--bp2) - 100vw) * 1000,
            100%/ (var(--mobile) + 1) + 0.1%
          ),
          (var(--bp1) - 100vw) * 1000,
          100%/ (var(--default) + 1) + 0.1%
        ),
        (var(--bp0) - 100vw) * 1000,
        100%
      ),
      1fr
    )
  )`};
    ${gridTemplateColumns &&
    css`
      grid-template-columns: ${gridTemplateColumns};
    `}
    ${gridTemplateRows &&
    css`
      grid-template-rows: ${gridTemplateRows};
    `}
  
  column-gap: ${columnGap ?? "16px"};
    row-gap: ${rowGap ?? "16px"};

    @media ${({ theme }) => theme.data.breakPoint.md} {
      column-gap: ${columnGap ?? "24px"};
      row-gap: ${rowGap ?? "24px"};
    }

    @media ${({ theme }) => theme.data.breakPoint.lg} {
      column-gap: ${columnGap ?? "16px"};
      row-gap: ${rowGap ?? "16px"};
    }
  `}
`;

export default GridStyles;
