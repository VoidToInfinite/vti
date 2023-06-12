"use client";

import styled from "styled-components";

export const ScSocialsWrapper = styled.div`
  margin: 2.5rem 0 0 0;
  width: 100%;
  z-index: 11;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    margin: 4rem 0 0 0;
    width: 50%;
  }

  @media ${({ theme }) => theme.data.breakPoint.xl} {
    width: 25%;
  }
`;

export const ScSocialsList = styled.ul`
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  list-style: none;
  height: 40px;
  width: auto;
`;

export const ScSocialsIcon = styled.li`
  height: 35px;
  width: 35px;
  position: relative;

  & a {
    height: 35px;
    width: 35px;
  }

  & a img {
    height: 100%;
    width: 100%;
    object-fit: cover;
    filter: invert(90%);
  }
`;
