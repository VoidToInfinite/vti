"use client";

import React from "react";
import StyledComponentsRegistry from "@/theme/registry";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalStyles } from "@/theme/GlobalStyles";
import { I18nProvider } from "@/i18n/I18nProvider";
import { StageProvider } from "@/motion/StageProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider>
        <GlobalStyles />
        {/* Dentro de ThemeProvider (spec §7.1): el hero y el navbar que
            consumen useStage() ya viven los dos en este mismo árbol, y es
            la ubicación natural de cualquier proveedor "de interfaz
            global" de la página -- ver el docblock de StageProvider para
            por qué no necesita leer el tema en sí. */}
        <StageProvider>
          <I18nProvider>{children}</I18nProvider>
        </StageProvider>
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
