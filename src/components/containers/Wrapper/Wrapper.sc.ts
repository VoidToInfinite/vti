"use client";

import styled, { css } from "styled-components";
import { WrapperType } from "./Wrapper.types";

interface WrapperProps {
  wrapperType: WrapperType;
}

const WrapperModalStyle = css`
  height: 100%;
  width: 100%;
  display: grid;
  place-items: center;
  position: fixed;
  top: 0px;
  bottom: 0px;
  z-index: 9999;
  &:before {
    content: "";
    background-color: rgba(0, 0, 0, 0.5);
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 9998;
  }
`;

const WrapperNotifyStyle = css`
  &#app-noty-wrapper {
    height: auto;
    width: 100%;
    padding-bottom: 1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    display: flex;
    align-items: center;
    flex-direction: column-reverse;
    justify-content: center;
    gap: 8px;
    position: fixed;
    left: 0px;
    bottom: 0px;
    z-index: 9999;

    @media ${({ theme }) => theme.data.breakPoint.md} {
      width: auto;
      align-items: end;
      justify-content: flex-start;
      left: auto;
      bottom: 0px;
      right: 0px;
      padding-right: 1rem;
    }
  }
`;

const WRAPPER_STYLE = {
  modal: WrapperModalStyle,
  notify: WrapperNotifyStyle,
};

const ScWrapper = styled.div<WrapperProps>`
  /* Definir estilos por tamaño */
  ${({ wrapperType }) => WRAPPER_STYLE[wrapperType]}
`;

export default ScWrapper;
