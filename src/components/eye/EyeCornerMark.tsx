"use client";
import type { ReactElement } from "react";
import styled from "styled-components";

const ScMark = styled.span`
  display: inline-block;
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  border-radius: ${({ theme }) => theme.data.radius.full};
  background: radial-gradient(
    circle at 50% 50%,
    oklch(0.66 0.142 235.851 / 0.95),
    oklch(0.528 0.259 311.928 / 0.6) 55%,
    transparent 78%
  );
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard},
    transform ${({ theme }) => theme.data.motion.duration.base}
      ${({ theme }) => theme.data.motion.easing.standard};

  &[data-visible="true"] {
    opacity: 1;
    transform: scale(1);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
    &[data-visible="true"] {
      transform: none;
    }
  }
`;

export function EyeCornerMark({ visible }: { visible: boolean }): ReactElement {
  return (
    <ScMark
      aria-hidden="true"
      data-visible={visible}
    />
  );
}
