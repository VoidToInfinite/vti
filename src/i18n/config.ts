import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";
import esLegal from "./locales/es/legal.json";
import enLegal from "./locales/en/legal.json";

export const defaultNS = "common";

/*
 * Los tres namespaces se cargan de forma síncrona, sin carga diferida.
 * Con `output: "export"` no hay servidor que sirva un bundle de traducción
 * bajo demanda, y `legal` -- el más pesado de los tres -- es justo el que
 * tiene que estar presente en el HTML PRERENDERIZADO para que Google indexe
 * el texto de los documentos legales. Diferirlo dejaría las dos páginas
 * legales vacías para el rastreador.
 *
 * El namespace `consent` desapareció el 2026-08-08 con el sistema de
 * consentimiento entero. Los nombres y finalidades de la tabla de
 * almacenamiento, que eran su única parte con consumidor fuera del banner,
 * viven ahora en `legal` (`Legal.common.storage.*`).
 */
export const resources = {
  es: { common: esCommon, home: esHome, legal: esLegal },
  en: { common: enCommon, home: enHome, legal: enLegal },
} as const;

export const namespaces = ["common", "home", "legal"] as const;

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
