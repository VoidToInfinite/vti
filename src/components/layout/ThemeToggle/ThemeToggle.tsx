"use client";

import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useTheme } from "@/theme/ThemeProvider";

const ScThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${({ theme }) => theme.data.space[6]};
  width: ${({ theme }) => theme.data.space[6]};
  border-radius: ${({ theme }) => theme.data.radius.full};
  font-size: 1rem;
  line-height: 1;
  background-color: ${({ theme }) => theme.data.semantic.surfaceSunken};
  cursor: pointer;
  transition: transform ${({ theme }) => theme.data.motion.duration.base}
    ${({ theme }) => theme.data.motion.easing.standard};

  /* Hover-lift: misma primitiva que Button/Socials (translateY(-2px)), no
     el scale(1.05) inventado que traía antes — un solo lenguaje de
     movimiento para todo hover del sistema. */
  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
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
