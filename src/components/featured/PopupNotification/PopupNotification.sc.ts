"use client";

import styled, { css } from "styled-components";
import type { NotificationTypes } from "./PopupNotification.types";

interface INotificationProps {
  type: NotificationTypes;
  isVisible: boolean;
}

interface INotificationTimerProps {
  width?: number;
}

const NotificationTypeStyle = css`
  ${({ theme }) => css`
    background-color: ${theme.data.background.primary[300]};
    border: 1px solid ${theme.data.background.primary[100]};
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    & > div[class*="ScNotificationHeader"] {
      background-color: ${theme.data.background.primary[400]};
      border-bottom: 1px solid ${theme.data.background.primary[800]};
      & > button span svg {
        color: ${theme.data.typography.primaryColor[500]};
      }
    }
    & > div[class*="ScNotificationTimer"] {
      background-color: ${theme.data.background.primary[100]};
    }
  `};
`;

const NotificationTypeStyleSuccess = css`
  ${NotificationTypeStyle}
  ${({ theme }) => css`
    ${theme.data.isLightTheme
      ? css`
          border: 1px solid ${theme.data.color.success[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.success[500]};
            border-bottom: 1px solid ${theme.data.color.success[500]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.success[500]};
          }
        `
      : css`
          border: 1px solid ${theme.data.color.success[400]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.success[400]};
            border-bottom: 1px solid ${theme.data.color.success[400]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.success[400]};
          }
        `}
  `};
`;

const NotificationTypeStyleInformation = css`
  ${NotificationTypeStyle}
  ${({ theme }) => css`
    ${theme.data.isLightTheme
      ? css`
          border: 1px solid ${theme.data.color.information[500]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.information[500]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.information[500]};
          }
        `
      : css`
          border: 1px solid ${theme.data.color.information[400]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.information[400]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.information[400]};
          }
        `}
  `};
`;

const NotificationTypeStyleWarning = css`
  ${NotificationTypeStyle}
  ${({ theme }) => css`
    ${theme.data.isLightTheme
      ? css`
          border: 1px solid ${theme.data.color.warning[500]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.warning[500]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.warning[500]};
          }
        `
      : css`
          border: 1px solid ${theme.data.color.warning[400]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.warning[400]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.warning[400]};
          }
        `}
  `};
`;

const NotificationTypeStyleError = css`
  ${NotificationTypeStyle}
  ${({ theme }) => css`
    ${theme.data.isLightTheme
      ? css`
          border: 1px solid ${theme.data.color.error[500]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.error[500]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.error[500]};
          }
        `
      : css`
          border: 1px solid ${theme.data.color.error[400]};
          color: ${theme.data.typography.primaryColor[500]};
          & > div[class*="ScNotificationHeader"] {
            background-color: ${theme.data.color.error[400]};
            color: ${theme.data.background.primary[500]};
            & > button span svg {
              color: ${theme.data.background.primary[500]};
            }
          }
          & > div[class*="ScNotificationTimer"] {
            background-color: ${theme.data.color.error[400]};
          }
        `}
  `};
`;

const NOTIFICATION_TYPE_STYLE = {
  default: NotificationTypeStyle,
  success: NotificationTypeStyleSuccess,
  information: NotificationTypeStyleInformation,
  warning: NotificationTypeStyleWarning,
  error: NotificationTypeStyleError,
};

const ScNotification = styled.div<INotificationProps>`
  height: auto;
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);

  display: ${({ isVisible }) => (isVisible ? "grid" : "none")};
  row-gap: 4px;
  grid-template-rows: auto 1fr auto;

  /* Definir estilos por tipo */
  ${({ type }) => NOTIFICATION_TYPE_STYLE[type]}
  overflow: hidden;
  z-index: 999;

  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: max(100px, 150px);
    width: 500px;
  }
`;

export const ScNotificationHeader = styled.div`
  height: 30px;
  width: 100%;
  padding-left: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  & > span {
    & > svg {
      fill: none;
    }
  }
  & > p {
    flex-grow: 2;
  }
`;

export const ScNotificationBody = styled.div`
  width: 100%;
  padding: 12px;
  display: flex;
  aling-items: center;
  justify-content: flex-start;
  flex-direction: column;
  gap: 8px;
  &:first-child {
    font-weight: 600;
  }
  @media ${({ theme }) => theme.data.breakPoint.md} {
    height: auto;
    & > p {
      padding: 0px;
      &:last-child {
        font-size: 14px;
      }
    }
  }
`;

export const ScNotificationTimer = styled.div<INotificationTimerProps>`
  height: 8px;
  width: ${({ width }) => width}%;
  background-color: ${({ theme }) => theme.data.background.primary[800]};
`;

export default ScNotification;
