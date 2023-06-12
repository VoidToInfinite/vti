/* eslint-disable @typescript-eslint/no-floating-promises */
import i18n from "i18next";
import i18nBackend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

const getCurrentHost =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://voidtoinfinite.github.io";

i18n
  .use(i18nBackend)
  .use(initReactI18next)
  .init({
    fallbackLng: "es",
    lng: "es",
    interpolation: {
      escapeValue: false,
    },
    ns: ["common", "home", "reflection"],
    defaultNS: "common",
    backend: {
      loadPath: `${getCurrentHost}/i18n/{{ns}}/{{lng}}.json`,
    },
  });

export default i18n;
