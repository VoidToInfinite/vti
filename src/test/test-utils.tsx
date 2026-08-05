import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { ConsentProvider } from "@/consent/ConsentProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import i18n from "@/i18n/config";

/*
 * Réplica del árbol de proveedores REAL de `app/providers.tsx`, en el mismo
 * orden. `ConsentProvider` entra aquí (entrega 2026-08-04) porque desde esta
 * entrega el `Footer` consume `useConsent()` para su enlace de preferencias
 * de cookies, y el `Footer` lo montan la home y las cuatro páginas legales:
 * sin el proveedor, cualquier test que renderice el pie fallaría por una
 * razón que no tiene nada que ver con lo que ese test comprueba.
 *
 * Un test que necesite CONTROLAR el estado de consentimiento puede seguir
 * montando su propio `ConsentProvider` dentro del árbol: el proveedor más
 * cercano gana en su subárbol, así que anidar no rompe nada
 * (`ConsentProvider.test.tsx` hace exactamente eso).
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <ConsentProvider>{children}</ConsentProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react";
