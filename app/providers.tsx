"use client";

import React, { type ReactElement } from "react";
import StyledComponentsRegistry from "@/theme/registry";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlobalStyles } from "@/theme/GlobalStyles";
import { I18nProvider } from "@/i18n/I18nProvider";
import { StageProvider } from "@/motion/StageProvider";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}): ReactElement {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider>
        <GlobalStyles />
        {/* Dentro de ThemeProvider (spec §7.1): el hero y el navbar que
            consumen useStage() ya viven los dos en este mismo árbol, y es
            la ubicación natural de cualquier proveedor "de interfaz
            global" de la página -- ver el docblock de StageProvider para
            por qué no necesita leer el tema en sí. */}
        {/* Aquí vivía `ConsentProvider` + `CookieBanner`, retirados el
            2026-08-08. No se "simplificó" el árbol: la revisión legal de esa
            fecha comprobó que el sitio no escribe NADA que requiera
            consentimiento previo (`src/config/storage.ts`), y un banner que
            pide permiso para almacenamiento exento del art. 22.2 LSSI-CE no
            es una cautela, es fricción sin cobertura legal y una petición de
            consentimiento inválida por innecesaria. Si algún día entra una
            tecnología no exenta, el proveedor vuelve AQUÍ, dentro de
            `I18nProvider` (su copia se traduce) y con el banner montado
            DESPUÉS de `children`, que es el orden de tabulación correcto para
            una capa no bloqueante. */}
        <StageProvider>
          <I18nProvider>{children}</I18nProvider>
        </StageProvider>
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
