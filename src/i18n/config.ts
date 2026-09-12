import i18n, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LOCALE, type Locale } from "@/config/site";
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
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS,
    ns: [...EAGER_NAMESPACES],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  initialized = true;
  return i18n;
}

/**
 * UNA INSTANCIA DE i18next POR IDIOMA, ELEGIDA POR LA RUTA (2026-08-18).
 *
 * Por qué no basta con `changeLanguage()`: con `output: "export"` el HTML de
 * cada ruta se hornea en el build, y el inglés tiene que estar YA en ese HTML
 * — si el cambio de idioma ocurriera tras hidratar, el documento que ve un
 * rastreador (y el que ve cualquiera con JavaScript desactivado) seguiría
 * siendo castellano en `/en/`, que es exactamente el defecto que estas rutas
 * existen para cerrar. Y forzar `changeLanguage("en")` a nivel de módulo desde
 * la página inglesa NO sirve: i18next es un singleton de módulo compartido por
 * TODAS las rutas que se prerenderizan en el mismo proceso, así que el idioma
 * se filtraría a las rutas castellanas según el orden —no determinista— en que
 * el build las renderice.
 *
 * `cloneInstance` es la vía que i18next documenta para justo esto (una
 * instancia por render con idioma propio). Lo importante, y verificado leyendo
 * el paquete instalado (`node_modules/i18next/dist/cjs/i18next.js`), es que el
 * clon COMPARTE el almacén de recursos:
 *
 *   - `cloneInstance()` copia `store` por referencia (`membersToCopy =
 *     ['store','services','language']`) y solo lo duplica si se le pasa
 *     `forkResourceStore`, que aquí NO se pasa;
 *   - `init()` reconstruiría el almacén desde `options.resources` — pero ese
 *     bloque entero está dentro de `if (!this.options.isClone)`, y
 *     `cloneInstance` fija `isClone: true`.
 *
 * Esa referencia compartida es la que hace que NO haya que tocar
 * `LegalDocument.tsx`: ese módulo registra el namespace `legal` con
 * `i18n.addResourceBundle(...)` sobre la instancia por defecto, a nivel de
 * módulo, y el clon lo ve porque los dos escriben y leen el MISMO almacén —
 * sin importar cuál de los dos módulos evalúe antes el bundler.
 */
const instances = new Map<Locale, I18nInstance>();

export function getI18nInstance(locale: Locale): I18nInstance {
  const base = initI18n();
  if (locale === DEFAULT_LOCALE) return base;

  const cached = instances.get(locale);
  if (cached) return cached;

  const clone = base.cloneInstance({ lng: locale });
  instances.set(locale, clone);
  return clone;
}

export default i18n;
