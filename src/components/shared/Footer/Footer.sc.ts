"use client";

import styled from "styled-components";

const ScFooter = styled.footer`
  background-color: ${({ theme }) => theme.data.background.primary[600]};
  border-top: 1px solid ${({ theme }) => theme.data.background.primary[100]};
  padding: 36px 24px;

  grid-area: footer;

  &:last-child p {
    font-size: 14px;
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 5vh 10vw;
  }
`;

export const ScFooterGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  grid-auto-rows: dense;
  grid-auto-flow: dense;
  grid-row-gap: 2rem;
`;

export const ScFooterNav = styled.div`
  & > a,
  & > h4 {
    display: block;
    font-size: 14px;
  }

  & > a {
    width: auto;
    margin-bottom: 14px;
  }
  & > h4 {
    font-weight: 600;
    margin-bottom: 16px;
  }
`;

export const ScFooterBrandMark = styled.div``;

export default ScFooter;
