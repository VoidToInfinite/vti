"use client";

import styled from "styled-components";

const ScScrollSnap = styled.div`
  &.sss_container {
    width: 100vw;
    overflow: hidden;
    & div.scroll-section-inner {
      height: 100vh;
      width: 300vw;
      display: flex;
      flex-direction: row;
      position: relative;

      & section:nth-child(even) {
        background-color: ${({ theme }) => theme.data.background.primary[300]};
        color: ${({ theme }) => theme.data.background.secondary[500]};
      }
      & section {
        width: 100vw;
        height: 100vh;
      }
    }
  }
`;

export default ScScrollSnap;
