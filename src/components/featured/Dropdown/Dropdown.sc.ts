"use client";

import styled from "styled-components";

const ScDropdown = styled.div`
  position: relative;
  width: 100%;
  cursor: pointer;

  & > button {
    position: relative;
    z-index: 2;
  }
`;

export const ScDropdownHeader = styled.div`
  height: 28px;
  background-color: ${({ theme }) => theme.data.background.primary[300]};

  & > div {
    & > p {
      font-size: 18px;
    }
    & svg {
      fill: transparent;
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.data.background.primary[500]};
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: 40px;
  }
`;

export const ScDropdownMenu = styled.div`
  position: absolute;
  overflow: hidden;
  z-index: 1;
  top: 50px;
  left: 0;
  width: 100%;
  opacity: 0;
  visibility: hidden;
  background-color: ${({ theme }) => theme.data.background.primary[300]};
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  translate: 0 -20px;
  transition: 0.4s;

  &.openDropdownMenu {
    opacity: 1;
    visibility: visible;
    translate: 0;
  }
`;

export default ScDropdown;
