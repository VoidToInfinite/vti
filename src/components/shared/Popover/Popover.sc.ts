"use client";

import IPosition from "@/types/Position.types";
import styled, { css } from "styled-components";

interface IPopoverProps extends IPosition {
  isDisplayed: boolean;
}

const ScPopover = styled.div<IPopoverProps>`
  ${({ position, top, right, bottom, left }) => css`
    position: ${position ?? "absolute"};
    top: ${top ?? "100%"};
    right: ${right ?? "0%"};
    ${bottom && `bottom: ${bottom};`}
    ${left && `left: ${left};`}
  `};
  ${({ isDisplayed }) =>
    css`
      display: ${isDisplayed ? "blok" : "none"};
    `};
  height: auto;
  width: auto;

  background-color: ${({ theme }) => theme.data.background.primary[300]};
  border: 1px solid ${({ theme }) => theme.data.background.primary[100]};
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 999;
`;

export const ScPopoverSeparator = styled.hr`
  height: 1px;
  width: 100%;
  background-color: ${({ theme }) => theme.data.background.primary[900]};
`;

export default ScPopover;
