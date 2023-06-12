"use client";

import styled, { css } from "styled-components";
import GridStyles from "@/styles/GridStyles";
import { GridProps } from "./Grid.types";
import ScBox from "../Box/Box.sc";

/* eslint-disable max-lines-per-function */
const ScGrid = styled(ScBox)<GridProps>`
  ${({ container, backgroundColor }) => css`
    --bp0: 0px;
    --bp1: 480px;
    --bp2: 768px;
    --bp3: 1200px;

    /* first breakpoint*/
    --default: 4;
    /* first breakpoint*/
    --mobile: 4; /* 12 columns large width (TV - Desktop) */
    /* second breakpoint*/
    --tablet: 8; /* 6 columns medium width (Laptop - Tablet) */
    /* third breakpoint*/
    --laptop: 12; /* 2 columns short width (Mobile) */
    ${GridStyles}
    /* background properties */
    ${backgroundColor &&
    css`
      background-color: ${backgroundColor};
    `}
    /* grid properties */
    display: ${container ? "grid" : "block"};
  `}
`;

export default ScGrid;
