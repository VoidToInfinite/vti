"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useTheme } from "@/theme/ThemeProvider";

const ScThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
  background-color: ${({ theme }) => theme.data.color.primary[100]};
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover,
  &:focus-visible {
    transform: scale(1.05);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:focus-visible {
      transform: none;
    }
  }
`;

export function ThemeToggle() {
  const { t } = useTranslation("common");
  const { themeName, toggleTheme } = useTheme();
  const isLight = themeName === "light";
  const label = isLight
    ? t("Common.ThemeToggle.switchToDark")
    : t("Common.ThemeToggle.switchToLight");

  return (
    <ScThemeToggle
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{isLight ? "🌙" : "☀️"}</span>
    </ScThemeToggle>
  );
}
