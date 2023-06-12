"use client";

import styled from "styled-components";

interface IOverlayProps {
  isVisible: boolean;
}

export const ScOverlay = styled.div<IOverlayProps>`
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${({ isVisible }) => (isVisible ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  opacity: ${({ isVisible }) => (isVisible ? "1" : "0")};
  transition: 0.3s;
  visibility: ${({ isVisible }) => (isVisible ? "visible" : "hidden")};
  z-index: 998;
`;

export default ScOverlay;
