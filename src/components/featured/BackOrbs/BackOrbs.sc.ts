"use client";

import styled, { keyframes } from "styled-components";

// Create keyframes
const primaryPulse = keyframes`
  0% {
    opacity: 0.6;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.1;
    transform: scale(2.75);
  }
  100% {
    opacity: 0.6;
    transform: scale(0.5);
  }
`;

const otherPulse = keyframes`
  0% {
    opacity: 0.7;
    transform: scale(0.5);
  }
  50% {
    opacity: 0.1;
    transform: scale(1.5);
  }
  100% {
    opacity: 0.7;
    transform: scale(0.5);
  }
`;

export const ScBubbleGlass = styled.div`
  width: 100%;
  height: 100%;
  background-color: ${({ theme }) => theme.data.background.primary[500]};
  position: fixed;
  top: 0;
  left: 0;
  z-index: 0;
  overflow: hidden;
  opacity: 0.5;
  -webkit-backdrop-filter: blur(8px);
  -moz-backdrop-filter: blur(8px);
  -ms-backdrop-filter: blur(8px);
  -o-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);

  -webkit-transition: all 1s ease-in-out;
  -moz-transition: all 1s ease-in-out;
  -ms-transition: all 1s ease-in-out;
  -o-transition: all 1s ease-in-out;
  transition: all 1s ease-in-out;
`;

const ScBubble = styled.div`
  height: 32rem;
  width: 32rem;
  border-radius: 50%;
  filter: blur(10rem);
  position: absolute;
  @media ${({ theme }) => theme.data.breakPoint.md} {
    -webkit-backdrop-filter: blur(3px);
    -moz-backdrop-filter: blur(3px);
    -ms-backdrop-filter: blur(3px);
    -o-backdrop-filter: blur(3px);
    backdrop-filter: blur(3px);
    filter: blur(8rem);
  }
`;

export const ScBubblePrimary = styled(ScBubble)`
  height: 24rem;
  width: 24rem;
  background-color: ${({ theme }) => theme.data.color.primary[500]};
  z-index: -2;
  animation: ${primaryPulse} 8s infinite;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    background-color: ${({ theme }) => theme.data.color.primary[500]};
    height: 16rem;
    width: 16rem;
    box-shadow: 0 2rem 4rem 0 ${({ theme }) => theme.data.color.primary[500]};
    position: absolute;
    top: 45vh;
    left: 16rem;
    filter: blur(8rem);
  }
  @media ${({ theme }) => theme.data.breakPoint.xl} {
    height: 32rem;
    width: 32rem;
    top: 25vh;
    left: 35vw;
  }
`;

export const ScBubbleSecondary = styled(ScBubble)`
  height: 24rem;
  width: 24rem;
  background-color: ${({ theme }) => theme.data.color.secondary[500]};
  position: absolute;
  bottom: -16rem;
  left: -16rem;
  z-index: -3;
  animation: ${otherPulse} 8s infinite;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: 16rem;
    width: 16rem;
    background-color: ${({ theme }) => theme.data.color.secondary[500]};
    box-shadow: 0 2rem 4rem 0 ${({ theme }) => theme.data.color.secondary[500]};
    bottom: -16rem;
    left: -16rem;
  }
  @media ${({ theme }) => theme.data.breakPoint.xl} {
    height: 32rem;
    width: 32rem;
  }
`;

export const ScBubbleTertiary = styled(ScBubble)`
  height: 24rem;
  width: 24rem;
  background-color: ${({ theme }) => theme.data.color.tertiary?.[500]};
  position: absolute;
  bottom: -16rem;
  right: -16rem;
  z-index: -4;
  animation: ${otherPulse} 8s infinite;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: 16rem;
    width: 16rem;
    background-color: ${({ theme }) => theme.data.color.tertiary?.[500]};
    box-shadow: 0 2rem 4rem 0 ${({ theme }) => theme.data.color.tertiary?.[500]};
    bottom: -16rem;
    right: -16rem;
  }
  @media ${({ theme }) => theme.data.breakPoint.xl} {
    height: 32rem;
    width: 32rem;
  }
`;
