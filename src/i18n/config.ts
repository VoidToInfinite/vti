import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";

export const defaultNS = "common";

export const resources = {
  es: { common: esCommon, home: esHome },
  en: { common: enCommon, home: enHome },
} as const;

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: "es",
    fallbackLng: "es",
    defaultNS,
    ns: ["common", "home"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  initialized = true;
  return i18n;
}

export default i18n;
