"use client";

import styled from "styled-components";

export const ScNavbar = styled.nav`
  height: 54px;
  width: 100%;
  padding: 0rem 0.8rem;
  border-bottom: 1px solid ${({ theme }) => theme.data.background.primary[300]};
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;

  grid-area: nav;
  z-index: 1;
  &:nth-child(1) span,
  &:nth-child(1) button span {
    & > svg {
      fill: ${({ theme }) => theme.data.typography.primaryColor[500]};
      color: ${({ theme }) => theme.data.typography.primaryColor[500]};
    }
  }

  &.overlayMenu .navbar-menu {
    transform: translate(0px, 0px);
    visibility: visible;
  }

  & > div.navbar-menu {
    height: 100%;
    width: 70vw;
    position: fixed;
    top: 0;
    left: 0;
    transform: translate(-100%, 0);
    padding: 20px;

    background-color: ${({ theme }) => theme.data.background.primary[500]};

    visibility: hidden;
    transition: translate 0.3;
    z-index: 999;

    a.navbar-link {
      display: block;
      font-weight: 400;
    }
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    padding: 0 16px;
    justify-content: space-between;
    gap: 1rem;

    & > div:nth-child(2) button:first-of-type {
      display: none;
    }
  }

  @media ${({ theme }) => theme.data.breakPoint.lg} {
    padding: 0 24px;
  }
`;

export const ScOverlay = styled.nav;
