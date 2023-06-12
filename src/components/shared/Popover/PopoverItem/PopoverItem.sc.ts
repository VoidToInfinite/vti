"use client";

import styled from "styled-components";

const ScPopoverItem = styled.div`
  height: 40px;
  width: 100%;
  padding: 8px 16px;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  gap: 8px;

  & > span svg {
    fill: transparent !important;
  }

  & > p {
    flex-grow: 2;
    font-size: 1rem;
  }

  &:hover {
    background-color: ${({ theme }) => theme.data.background.primary[200]};
  }
`;

export default ScPopoverItem;
