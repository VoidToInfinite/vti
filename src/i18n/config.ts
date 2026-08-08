import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esCommon from "./locales/es/common.json";
import enCommon from "./locales/en/common.json";
import esHome from "./locales/es/home.json";
import enHome from "./locales/en/home.json";

export const defaultNS = "common";

/*
 * `common` y `home` se cargan de forma síncrona, sin carga diferida: con
 * `output: "export"` no hay servidor que sirva un bundle de traducción bajo
 * demanda, y son los dos namespaces que la HOME usa siempre.
 *
 * `legal` YA NO viaja aquí (auditoría de rendimiento 2026-08-08): su JSON
 * pesa ~72 KB (16,8 KB gzip) y, arrastrado en este `resources`, viajaba en
 * el chunk común de la home -- todo visitante lo descargaba aunque nunca
 * visitara `/privacidad` ni `/aviso-legal`. `LegalDocument.tsx` (el ÚNICO
 * consumidor de `useTranslation("legal")` en todo el repo) registra su
 * propio namespace en caliente vía `i18n.addResourceBundle(...)`, a nivel de
 * MÓDULO -- no en un `useEffect` -- para seguir cumpliendo el requisito de
 * siempre: el contenido legal TIENE que estar en el HTML PRERENDERIZADO de
 * esas rutas (SEO). Código a nivel de módulo de un Client Component corre
 * también durante el prerenderizado estático de Next, antes de que React
 * invoque la función del componente, tanto en la fase de servidor como en la
 * de cliente -- así que para cuando `LegalDocument()` llama a
 * `useTranslation("legal")` el namespace ya está poblado. Ver el docblock de
 * `LegalDocument.tsx` para el detalle completo, incluida la garantía de
 * orden frente a este mismo módulo (`initI18n()` es idempotente a propósito:
 * cualquiera de los dos, este archivo o `LegalDocument.tsx`, puede evaluarse
 * primero sin que el otro pise los datos del que fue segundo).
 *
 * El namespace `consent` desapareció el 2026-08-08 con el sistema de
 * consentimiento entero. Los nombres y finalidades de la tabla de
 * almacenamiento, que eran su única parte con consumidor fuera del banner,
 * viven ahora en `legal` (`Legal.common.storage.*`).
 */
export const resources = {
  es: { common: esCommon, home: esHome },
  en: { common: enCommon, home: enHome },
} as const;

/**
 * TODOS los namespaces reales de la aplicación -- `legal` incluido, aunque
 * su JSON ya no viaje en `resources` (ver docblock de arriba). Sigue
 * exportándose completo porque `locales.test.ts` lo usa como candado: exige
 * que todo namespace que este módulo conozca tenga su propio candado de
 * paridad es/en en ese archivo. Lo que SÍ se carga de forma síncrona en
 * `init()` es `EAGER_NAMESPACES`, más abajo -- un subconjunto propio.
 */
export const namespaces = ["common", "home", "legal"] as const;

/** Namespaces que se cargan de forma síncrona en `i18n.init()` (ver docblock de `resources`). */
const EAGER_NAMESPACES = ["common", "home"] as const;

let initialized = false;

export function initI18n() {
  if (initialized) return i18n;
  i18n.use(initReactI18next).init({
    resources,
    lng: "es",
    fallbackLng: "es",
    defaultNS,
    ns: [...EAGER_NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  initialized = true;
  return i18n;
}

export default i18n;
