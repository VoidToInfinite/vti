"use client";

import styled, { css } from "styled-components";
import Length from "@/types/Length.types";
import { ButtonSize, ButtonTypeStyle } from "./Button.types";

interface ScButtonProps {
  size?: ButtonSize;
  typeStyle?: ButtonTypeStyle;
  hashText?: boolean;
  borderColor?: string;
  borderRadius?: string;
  borderWidth?: string;
  disabled?: boolean;
  isActive?: boolean;
  onClick?: (text?: string) => void;
}

/**
 * A
 * @param fontSize font size
 * @param widthHeight line height
 * @param gap gap
 * @param iconSize icon size
 * @param padding padding
 * @returns style properties from Button
 */
const getButtonSizeStyles = (
  fontSize: Length,
  height: Length,
  width: Length,
  gap: Length,
  iconSize: Length,
  padding: Length[]
  // eslint-disable-next-line max-params
) => css<ScButtonProps>`
  font-size: ${fontSize};
  gap: ${gap};
  ${({ hashText }) => (hashText ? "min" : "max")}-height: ${height};
  min-width: ${width};
  ${({ hashText }) => (hashText ? `padding: ${padding.join(" ")};` : "")}
  span {
    height: ${iconSize};
    width: ${iconSize};
  }
`;

const ButtonSizeDefault = css<ScButtonProps>`
  ${getButtonSizeStyles("16px", "44px", "44px", "8px", "20px", ["0px", "24px"])}
`;

const ButtonSizeSmall = css<ScButtonProps>`
  ${getButtonSizeStyles("14px", "32px", "32px", "4px", "16px", [
    "0px",
    "16px",
    "0px",
    "12px",
  ])}
`;

const ButtonSizeMedium = css<ScButtonProps>`
  ${getButtonSizeStyles("16px", "44px", "44px", "8px", "20px", [
    "0px",
    "24px",
    "0px",
    "20px",
  ])}
`;

const ButtonSizeLarge = css<ScButtonProps>`
  ${getButtonSizeStyles("16px", "52px", "52px", "8px", "20px", [
    "0px",
    "32px",
    "0px",
    "24px",
  ])}
`;

const ButtonSizeExtraLarge = css<ScButtonProps>`
  ${getButtonSizeStyles("16px", "52px", "100%", "8px", "20px", [
    "0px",
    "32px",
    "0px",
    "24px",
  ])}
`;

const ButtonTypePrimary = css`
  ${({ theme }) => css`
    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.primary[500]};
          color: ${theme.data.background.primary[500]};

          @media (hover: hover) {
            &:hover {
              background: ${theme.data.color.primary[600]};
            }
          }

          &:active {
            background-color: ${theme.data.color.primary[600]};
            box-shadow: 0 0 6px 0 ${theme.data.color.primary[900]};
          }
        `
      : css`
          background-color: ${theme.data.color.primary[400]};
          color: ${theme.data.typography.primaryColor[500]};

          @media (hover: hover) {
            &:hover {
              background: ${theme.data.color.primary[500]};
            }
          }

          &:active {
            background-color: ${theme.data.color.primary[500]};
            box-shadow: 0 0 6px 0 ${theme.data.color.primary[800]};
          }
        `}
  `};
`;

const ButtonTypeSecondary = css`
  ${({ theme }) => css`
    background-color: ${theme.data.color.primary[200]};
    color: ${theme.data.color.primary[800]};

    @media (hover: hover) {
      &:hover {
        opacity: 0.8;
      }
    }

    &:active {
      opacity: 0.8;
      box-shadow: 0 0 6px 0 ${theme.data.color.primary[200]};
    }
  `};
`;

const ButtonTypeTertiary = css`
  ${({ theme }) => css`
    background-color: transparent;
    outline: 2px solid ${theme.data.color.primary[500]};
    ${theme.data.isLightTheme
      ? css`
          color: ${theme.data.color.primary[800]};
        `
      : css`
          color: ${theme.data.color.primary[200]};
        `}

    @media (hover: hover) {
      &:hover {
        background-color: ${theme.data.background.primary[700]};
      }
    }

    &:active {
      background-color: ${theme.data.background.primary[700]};
      box-shadow: 0 0 6px 0 ${theme.data.background.primary[700]};
    }
  `};
`;

const ButtonTypeGhost = css`
  ${({ theme }) => css`
    background-color: transparent;
    ${theme.data.isLightTheme
      ? css`
          color: ${theme.data.color.primary[800]};
        `
      : css`
          color: ${theme.data.color.primary[200]};
        `}
  `};
`;

const ButtonTypeSuccess = css`
  ${({ theme }) => css`
    color: ${theme.data.background.primary[500]};
    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.success[500]};
          @media (hover: hover) {
            &:hover {
              background-color: ${theme.data.color.success[600]};
            }
          }

          &:active {
            background-color: ${theme.data.color.success[600]};
            box-shadow: 0 0 6px 0 ${theme.data.color.success[400]};
          }
        `
      : css`
          background-color: ${theme.data.color.success[500]};
          @media (hover: hover) {
            &:hover {
              color: ${theme.data.typography.primaryColor[500]};
              background-color: ${theme.data.color.success[500]};
            }
          }

          &:active {
            color: ${theme.data.typography.primaryColor[500]};
            background-color: ${theme.data.color.success[500]};
            box-shadow: 0 0 6px 0 ${theme.data.color.success[600]};
          }
        `}
  `};
`;

const ButtonTypeInformation = css`
  ${({ theme }) => css`
    color: ${theme.data.background.primary[500]};
    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.information[600]};
          @media (hover: hover) {
            &:hover {
              background-color: ${theme.data.color.information[700]};
            }
          }

          &:active {
            background-color: ${theme.data.color.information[700]};
            box-shadow: 0 0 6px 0 ${theme.data.color.information[400]};
          }
        `
      : css`
          background-color: ${theme.data.color.information[400]};
          @media (hover: hover) {
            &:hover {
              color: ${theme.data.typography.primaryColor[500]};
              background-color: ${theme.data.color.information[500]};
            }
          }

          &:active {
            color: ${theme.data.typography.primaryColor[500]};
            background-color: ${theme.data.color.information[500]};
            box-shadow: 0 0 6px 0 ${theme.data.color.information[600]};
          }
        `}
  `};
`;

const ButtonTypeWarning = css`
  ${({ theme }) => css`
    color: ${theme.data.background.primary[500]};
    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.warning[600]};
          @media (hover: hover) {
            &:hover {
              background-color: ${theme.data.color.warning[700]};
            }
          }

          &:active {
            background-color: ${theme.data.color.warning[700]};
            box-shadow: 0 0 6px 0 ${theme.data.color.warning[400]};
          }
        `
      : css`
          background-color: ${theme.data.color.warning[400]};
          @media (hover: hover) {
            &:hover {
              color: ${theme.data.typography.primaryColor[500]};
              background-color: ${theme.data.color.warning[500]};
            }
          }

          &:active {
            color: ${theme.data.typography.primaryColor[500]};
            background-color: ${theme.data.color.warning[500]};
            box-shadow: 0 0 6px 0 ${theme.data.color.warning[600]};
          }
        `}
  `};
`;

const ButtonTypeError = css`
  ${({ theme }) => css`
    color: ${theme.data.background.primary[500]};
    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.error[600]};
          @media (hover: hover) {
            &:hover {
              background-color: ${theme.data.color.error[700]};
            }
          }

          &:active {
            background-color: ${theme.data.color.error[700]};
            box-shadow: 0 0 6px 0 ${theme.data.color.error[400]};
          }
        `
      : css`
          background-color: ${theme.data.color.error[400]};
          @media (hover: hover) {
            &:hover {
              color: ${theme.data.typography.primaryColor[500]};
              background-color: ${theme.data.color.error[500]};
            }
          }

          &:active {
            color: ${theme.data.typography.primaryColor[500]};
            background-color: ${theme.data.color.error[500]};
            box-shadow: 0 0 6px 0 ${theme.data.color.error[600]};
          }
        `}
  `};
`;

const ButtonTypeSidebar = css`
  &.active {
    color: ${({ theme }) => theme.data.typography.secondaryColor[500]};
    background-color: ${({ theme }) => theme.data.color.primary[500]};

    & > span svg {
      stroke: ${({ theme }) => theme.data.typography.secondaryColor[500]};
    }
  }
`;

const BUTTON_SIZE_STYLE = {
  sm: ButtonSizeSmall,
  md: ButtonSizeMedium,
  lg: ButtonSizeLarge,
  xl: ButtonSizeExtraLarge,
};

const BUTTON_TYPE_STYLE = {
  primary: ButtonTypePrimary,
  secondary: ButtonTypeSecondary,
  tertiary: ButtonTypeTertiary,
  ghost: ButtonTypeGhost,
  success: ButtonTypeSuccess,
  information: ButtonTypeInformation,
  warning: ButtonTypeWarning,
  error: ButtonTypeError,
  sidebar: ButtonTypeSidebar,
};

const ScButton = styled.button<ScButtonProps>`
  border-radius: ${({ borderRadius }) => borderRadius ?? css`12px`};
  ${({ borderColor, borderWidth }) =>
    borderWidth &&
    borderColor &&
    css`
      border: ${borderWidth} solid ${borderColor};
    `};
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-flow: row;

  & > span svg {
    fill: transparent;
  }

  ${({ isActive }) =>
    isActive &&
    css`
      box-shadow: 0 0 6px 0 rgba(0, 0, 0, 0.2);
      transform: translateY(1px);
    `}

  /* Definir estilos por tamaño */
  ${({ size }) => (size ? BUTTON_SIZE_STYLE[size] : ButtonSizeDefault)}

  /* Definir estilos por tipo */
  ${({ typeStyle }) =>
    typeStyle ? BUTTON_TYPE_STYLE[typeStyle] : ButtonTypePrimary}

  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
    @media (hover: hover) {
      &:hover {
        opacity: 0.2;
        background: ${({ theme }) => theme.data.color.primary[600]};
      }
    }
  }
`;

export default ScButton;
