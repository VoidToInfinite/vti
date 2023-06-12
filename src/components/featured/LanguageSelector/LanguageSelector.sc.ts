"use client";

import styled from "styled-components";

const ScLanguageSelector = styled.div`
  position: relative;
  width: 100%;
  cursor: pointer;
  border-radius: 10px 10px;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    width: 75px;
  }

  & > button {
    position: relative;
    z-index: 2;
  }
`;

export const ScLanguageSelectorHeader = styled.div`
  height: 38px;
  padding: 2px 8px;
  border-radius: 5px;

  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;

  & > div {
    & > p {
      font-size: 18px;
    }
    & img {
      height: 24px;
      width: 38px;
      border-radius: 5px;
    }
  }

  &:hover {
    background-color: ${({ theme }) => theme.data.background.primary[700]};
    outline: 1px solid ${({ theme }) => theme.data.background.primary[100]};
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: 42px;
  }
`;

export const ScLanguageSelectorMenu = styled.div`
  position: absolute;
  overflow: hidden;
  z-index: 999;
  top: 40px;
  left: 0;
  width: 100%;
  opacity: 0;
  visibility: hidden;
  background-color: ${({ theme }) => theme.data.background.primary[300]};
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  translate: 0 -20px;
  transition: 0.4s;

  &.openLanguageSelectorMenu {
    opacity: 1;
    visibility: visible;
    translate: 0;
  }
`;

export const ScLanguageSelectorItem = styled.div`
  height: 40px;
  width: 100%;
  padding: 2px 8px;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  gap: 8px;

  & > div img {
    height: 24px;
    width: 38px;
    border-radius: 5px;
  }

  & > p {
    flex-grow: 2;
    font-size: 1rem;
  }

  &:hover {
    background-color: ${({ theme }) => theme.data.background.primary[200]};
  }
`;

export default ScLanguageSelector;
