"use client";

import React from "react";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { ConsentProvider } from "@/consent/ConsentProvider";
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
          <I18nProvider>
            {/* ConsentProvider va DENTRO de I18nProvider por dos razones, no
                por costumbre: el banner y el panel traducen su copia con
                `useTranslation`, y el enlace "Preferencias de cookies" del
                Footer -- que es parte de `children` -- llama a
                `useConsent().openPreferences()`, así que el Footer tiene que
                quedar por debajo de este proveedor.

                `CookieBanner` se monta DESPUÉS de `children` a propósito:
                así queda al final del documento, que es el orden de
                tabulación correcto para una capa no bloqueante (D15) -- un
                banner al principio del DOM se comería el primer Tab de todo
                visitante sin que nada lo justifique. El banner monta también
                el panel de preferencias cuando se abre, así que este único
                punto de montaje deja operativas las dos piezas. */}
            <ConsentProvider>
              {children}
              <CookieBanner />
            </ConsentProvider>
          </I18nProvider>
        </StageProvider>
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
