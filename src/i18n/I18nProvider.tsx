"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { initI18n } from "./config";

initI18n();

const STORAGE_KEY = "vti-lang";

/**
 * Sincroniza `<html lang>` con el idioma activo de i18next.
 *
 * Arregla un defecto real, no hipotético: `app/layout.tsx` fija `lang="es"`
 * en el HTML prerenderizado y hasta esta entrega NADA lo actualizaba. Un
 * visitante que pasa a inglés se quedaba con todo el documento declarado
 * como español, y un lector de pantalla lo pronuncia con fonética española
 * -- palabra por palabra, en un idioma que no es el del texto. Es un
 * incumplimiento de WCAG 3.1.1 (Language of Page, nivel A), y no se puede
 * resolver en el layout porque es un Server Component: el idioma elegido
 * vive en `localStorage` y solo se conoce en cliente.
 *
 * Se aísla en una función porque hay DOS momentos en que hay que aplicarlo
 * -- al hidratar la preferencia guardada y en cada cambio posterior -- y
 * escribirlo dos veces es como diverge.
 */
function syncDocumentLang(lang: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Reading localStorage during render would break the static export's
    // prerendered HTML (no `window`) and risk a hydration mismatch. Syncing
    // it once, client-side only, after mount is the correct SSR-safe pattern
    // (mirrors ThemeProvider's persistence approach).
    if ((stored === "es" || stored === "en") && stored !== i18n.language) {
      void i18n.changeLanguage(stored);
    }
    // Se aplica también cuando NO hubo cambio de idioma: el atributo tiene
    // que reflejar el idioma activo siempre, no solo cuando la preferencia
    // guardada difiere de la actual.
    syncDocumentLang(i18n.language);

    // `languageChanged` cubre los cambios posteriores del selector de
    // idioma. Se suscribe aquí, y no en el propio selector, porque el
    // atributo es del documento entero: atarlo a un componente concreto lo
    // dejaría sin actualizar el día que el idioma se cambie desde otro sitio.
    i18n.on("languageChanged", syncDocumentLang);
    return () => {
      i18n.off("languageChanged", syncDocumentLang);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
