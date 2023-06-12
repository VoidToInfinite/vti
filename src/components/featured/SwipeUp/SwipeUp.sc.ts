"use client";

import styled from "styled-components";

export const ScSwipeUpWrapper = styled.div`
  width: 8rem;
  height: auto;

  display: grid;
  place-items: center;

  -webkit-animation: swipeUp 4s ease-in-out infinite;
  -moz-animation: swipeUp 4s ease-in-out infinite;
  -ms-animation: swipeUp 4s ease-in-out infinite;
  -o-animation: swipeUp 4s ease-in-out infinite;
  animation: swipeUp 4s ease-in-out infinite;

  @keyframes swipeUp {
    0% {
      transform: translateY(+2vh);
    }
    50% {
      transform: translateY(-1vh);
    }
    100% {
      transform: translateY(+2vh);
    }
  }
`;

export const ScSwipeUpArrowHead = styled.div`
  height: 0.25rem;
  width: 2.6rem;
  background-color: ${({ theme }) => theme.data.color.primary[500]};
  border-radius: 15px;

  transform: translate(-0.88rem, 6rem) rotate(-45deg);

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    background: ${({ theme }) => theme.data.color.primary[500]};
    height: 0.25rem;
    width: 2.6rem;
    border-radius: 15px;
    transform: translate(1.25rem, 1.25rem) rotate(90deg);
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    transform: translate(-0.88rem, 4.5rem) rotate(-45deg);
  }
`;

export const ScSwipeUpArrowBody = styled.div`
  background-color: ${({ theme }) => theme.data.color.primary[500]};
  border-radius: 15px;
  height: 0.25rem;
  width: 5.5rem;

  transform: translateY(8.5rem) rotate(-90deg);

  -webkit-animation: swipe-up--body 4s infinite;
  -moz-animation: swipe-up--body 4s infinite;
  -ms-animation: swipe-up--body 4s infinite;
  -o-animation: swipe-up--body 4s infinite;
  animation: swipe-up--body 4s infinite;

  &:before {
    content: "";
    bottom: 0;
    left: 0;
    position: absolute;
    background: ${({ theme }) => theme.data.color.primary[500]};
    height: 0.25rem;
    width: 1rem;
    border-radius: 15px;
    transform: translateX(-1.5rem);
  }

  &:after {
    content: "";
    bottom: 0;
    left: 0;
    position: absolute;
    background: ${({ theme }) => theme.data.color.primary[500]};
    height: 0.25rem;
    width: 0.5rem;
    border-radius: 30%;
    transform: translateX(-2.5rem);
  }

  @media ${({ theme }) => theme.data.breakPoint.md} {
    width: 4.5rem;
    transform: translateY(6.5rem) rotate(-90deg);
  }
`;

export const ScSwipeUpText = styled.p`
  color: ${({ theme }) => theme.data.typography.primaryColor[500]};
  font-weight: 400;
  transform: translateY(2.5rem);
`;
