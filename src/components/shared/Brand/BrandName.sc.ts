"use client";

import styled from "styled-components";

const ScBrandName = styled.svg`
  cursor: default;
  fill: ${({ theme }) => theme.data.typography.primaryColor[500]};

  & > g#gBr4ndVt1 {
    & text {
      &:nth-child(-n + 4) {
        transition: opacity 0.4s linear;
        &:hover {
          opacity: 0.05;
        }
      }
      &:nth-last-child(-n + 8) {
        transition: fill 0.4s linear;
        &:hover {
          fill: ${({ theme }) => theme.data.color.cta[500]};
        }
      }
    }
  }
`;

export default ScBrandName;
