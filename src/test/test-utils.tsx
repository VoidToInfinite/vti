import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { ThemeProvider } from "@/theme/ThemeProvider";
import i18n from "@/i18n/config";

/*
 * Réplica del árbol de proveedores REAL de `app/providers.tsx`, en el mismo
 * orden. `ConsentProvider` estuvo aquí entre el 2026-08-05 y el 2026-08-08,
 * mientras el `Footer` consumía `useConsent()` para su enlace de preferencias
 * de cookies; desaparece con el sistema de consentimiento entero, y el pie ya
 * no depende de ningún proveedor que este árbol tenga que replicar.
 */
function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>{children}</ThemeProvider>
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
