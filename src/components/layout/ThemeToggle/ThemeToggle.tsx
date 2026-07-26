"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/IconButton/IconButton";
import { useTheme } from "@/theme/ThemeProvider";
import { IconMoon, IconSun } from "./ThemeIcons";

// Migrado a IconButton (área táctil 44px, hover-lift, prefers-reduced-motion
// y disabled/aria-disabled se heredan de Button vía IconButton, no se
// reescriben aquí — ver IconButton.tsx).
//
// CAMBIO DE CONVENCIÓN (2026-07-26): hasta hoy el icono mostraba el tema
// DESTINO (luna estando en claro). A partir de ahora muestra el tema ACTIVO
// (sol en claro, luna en oscuro) — lectura directa sin traducción mental,
// icono = lo que ves ahora, no lo que vas a activar. El aria-label/title
// siguen describiendo la ACCIÓN (mismas claves i18n
// Common.ThemeToggle.switchToDark/switchToLight, sin cambio de texto).
export function ThemeToggle(): ReactElement {
  const { t } = useTranslation("common");
  const { themeName, toggleTheme } = useTheme();
  const isLight = themeName === "light";
  const label = isLight
    ? t("Common.ThemeToggle.switchToDark")
    : t("Common.ThemeToggle.switchToLight");

  return (
    <IconButton
      icon={isLight ? <IconSun /> : <IconMoon />}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    />
  );
}
