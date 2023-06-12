"use client";

import styled from "styled-components";

export const ScPageLoaderWraper = styled.div`
  background-color: ${({ theme }) => theme.data.background.primary[700]};
  color: ${({ theme }) => theme.data.color.primary[500]};

  height: 100vh;
  width: 100%;

  display: grid;
  place-items: center;

  & div {
    position: relative;
  }

  & div span {
    position: absolute;
    content: "";
    left: calc(100px - 65px);
    top: calc(100px - 65px);
    z-index: 2;

    animation: pulse 4s linear infinite;

    & > svg {
      fill: ${({ theme }) => theme.data.color.cta[900]};
    }

    @keyframes pulse {
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: rotate(2);
      }
    }
  }

  transition: all 1.25s linear;

  &.d0n3 {
    display: none;
  }
`;

export const ScOrb = styled.div`
  --violet: ${({ theme }) => theme.data.color.primary[300]};
  --blue: ${({ theme }) => theme.data.color.primary[200]};
  --light: ${({ theme }) => theme.data.color.primary[100]};

  z-index: 1;

  animation: spin 4s linear infinite;
  width: min(150px, 300px);
  height: min(150px, 300px);
  border-radius: 50%;
  box-shadow: inset 0px 0px 50px var(--light), inset 20px 0px 60px var(--violet),
    inset -20px 0px 60px var(--blue), inset 20px 0px 300px var(--violet),
    inset -20px 0px 300px var(--blue), 0px 0px 20px var(--light),
    -10px 0px 60px var(--violet), 10px 0px 60px var(--blue);

  @keyframes spin {
    50% {
      transform: rotate(180deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;
