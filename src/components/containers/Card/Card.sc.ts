"use client";

import styled from "styled-components";

const ScCard = styled.div`
  background-color: ${({ theme }) => theme.data.background.primary[300]};
  border: 1px solid ${({ theme }) => theme.data.background.primary[100]};
  border-radius: 10px;
  padding: 0.9rem 1rem 1.1rem 1rem;

  max-width: 380px;

  & > div p {
    hyphens: none;
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    height: 380px;
    width: auto;
    padding: 1rem;
  }
`;

export const ScCardImage = styled.span`
  & > img {
    border-radius: 15%;
  }
`;

export default ScCard;
