import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";
import esLegal from "./locales/es/legal.json";
import enLegal from "./locales/en/legal.json";
import esConsent from "./locales/es/consent.json";
import enConsent from "./locales/en/consent.json";

export const defaultNS = "common";

/*
 * Los cuatro namespaces se cargan de forma síncrona, sin carga diferida.
 * Con `output: "export"` no hay servidor que sirva un bundle de traducción
 * bajo demanda, y `legal` -- el más pesado de los cuatro -- es justo el que
 * tiene que estar presente en el HTML PRERENDERIZADO para que Google indexe
 * el texto de los documentos legales. Diferirlo dejaría cuatro páginas
 * vacías para el rastreador.
 */
export const resources = {
  es: { common: esCommon, home: esHome, legal: esLegal, consent: esConsent },
  en: { common: enCommon, home: enHome, legal: enLegal, consent: enConsent },
} as const;

export const namespaces = ["common", "home", "legal", "consent"] as const;

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: "es",
    fallbackLng: "es",
    defaultNS,
    ns: [...namespaces],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  initialized = true;
  return i18n;
}

export default i18n;
