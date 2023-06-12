"use client";

import styled, { css } from "styled-components";
import FlexStyles from "@/styles/FlexStyles";
import { FlexProps } from "./Flex.types";
import ScBox from "../Box/Box.sc";

const ScFlex = styled(ScBox)<FlexProps>`
  ${({ container, backgroundColor }) => css`
    position: relative;
    /* background properties */
    ${backgroundColor &&
    css`
      background-color: ${backgroundColor};
    `}
    /* flex properties */
    display: ${container ? "flex" : "block"};
    ${FlexStyles}
  `}
`;

export default ScFlex;
