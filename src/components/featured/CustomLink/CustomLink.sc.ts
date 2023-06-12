"use client";

import styled from "styled-components";
import Link from "next/link";

const ScCustomLink = styled(Link)`
  color: ${({ theme }) => theme.data.typography.primaryColor[500]};
  cursor: pointer;

  font-family: ${({ theme }) => theme.data.typography.main.font};
  font-size: clamp(14px, 1.25rem, 20px);
  font-weight: 400;
  letter-spacing: 0.25px;
  line-height: 1rem;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    line-height: 2rem;
  }
`;

export default ScCustomLink;
