"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { initI18n } from "./config";

initI18n();

const STORAGE_KEY = "vti-lang";

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
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
