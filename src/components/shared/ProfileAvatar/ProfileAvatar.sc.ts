"use client";

import styled, { css } from "styled-components";
import IProfileAvatar from "./ProfileAvatar.types";

const size = "38px";

const activeStyles = css`
  cursor: pointer;
  background-color: ${({ theme }) => theme.data.background.primary[500]};

  &::before {
    content: "";
    display: block;
    position: absolute;
    z-index: -1;
    top: -2px;
    left: -2px;
    height: calc(100% + 4px);
    width: calc(100% + 4px);
    border-radius: 50%;
    background: linear-gradient(
      45deg,
      ${({ theme }) => theme.data.color.primary[500]},
      ${({ theme }) => theme.data.color.secondary[500]},
      ${({ theme }) => theme.data.color.tertiary?.[500]},
      ${({ theme }) => theme.data.color.primary[500]}
    );
  }
`;

const avatarStyles = css`
  ${({ theme }) => css`
    cursor: pointer;

    ${theme.data.isLightTheme
      ? css`
          background-color: ${theme.data.color.primary[500]};
          color: ${theme.data.background.primary[400]};
        `
      : css`
          background-color: ${theme.data.color.primary[400]};
          color: ${theme.data.typography.primaryColor[500]};
        `}

    position: relative;
    height: 100%;
    width: 100%;
    border-radius: 50%;
  `};
`;

export const ScProfileAvatarWrapper = styled.div<IProfileAvatar>`
  cursor: pointer;

  display: block;
  position: relative;

  height: ${size};
  width: ${size};
  padding: 4px;
  border-radius: 50%;

  ${(p) => p.isActive && activeStyles}
`;

export const ScProfileAvatar = styled.img`
  ${avatarStyles}
  object-fit: cover;
`;

export const ScProfileAvatarName = styled.span`
  ${avatarStyles}
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
`;

export const ScProfileAvatarBadge = styled.span`
  height: 18px;
  width: 18px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.data.background.primary[500]};
  background-color: ${({ theme }) => theme.data.color.information[500]};

  display: block;
  position: absolute;
  top: -6px;
  right: -6px;
`;
