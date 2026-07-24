import styled, { css, keyframes } from "styled-components";

const pulseWide = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.15;
    transform: scale(1.8);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.5);
  }
`;

const pulseNarrow = keyframes`
  0% {
    opacity: 0.7;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.15;
    transform: scale(1.4);
  }
  100% {
    opacity: 0.7;
    transform: scale(0.5);
  }
`;

const orbBase = css`
  position: absolute;
  height: 22rem;
  width: 22rem;
  border-radius: 50%;
  filter: blur(9rem);
`;

const ScBackOrbs = styled.div`
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
  background-color: ${({ theme }) => theme.data.background.primary[500]};
  opacity: 0.6;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
`;

const ScOrbPrimary = styled.span`
  ${orbBase}
  top: -6rem;
  left: 10%;
  z-index: -1;
  background-color: ${({ theme }) => theme.data.color.primary[500]};
  animation: ${pulseWide} 9s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ScOrbSecondary = styled.span`
  ${orbBase}
  bottom: -10rem;
  left: -8rem;
  z-index: -2;
  background-color: ${({ theme }) => theme.data.color.secondary[500]};
  animation: ${pulseNarrow} 8s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const ScOrbTertiary = styled.span`
  ${orbBase}
  bottom: -10rem;
  right: -8rem;
  z-index: -3;
  background-color: ${({ theme }) => theme.data.color.tertiary?.[500]};
  animation: ${pulseNarrow} 10s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export function BackOrbs() {
  return (
    <ScBackOrbs aria-hidden="true">
      <ScOrbSecondary />
      <ScOrbPrimary />
      <ScOrbTertiary />
    </ScBackOrbs>
  );
}
