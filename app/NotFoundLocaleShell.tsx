"use client";

import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { DEFAULT_LOCALE, EN_ROUTES, type Locale } from "@/config/site";
import { LocaleShell } from "./providers";

/**
 * Prefijo de la rama inglesa, tomado de la ÚNICA fuente de verdad de rutas
 * (`EN_ROUTES.home`, `src/config/site.ts`) y no escrito a mano aquí: si algún
 * día el prefijo cambia, esta guarda cambia con él en vez de quedarse
 * apuntando a un `/en` que ya no existe.
 */
const EN_PREFIX = EN_ROUTES.home;

/**
 * Idioma que le corresponde a una URL ROTA, deducido de su propio camino.
 *
 * Coincidencia por PREFIJO, y aquí sí es lo correcto — al contrario que en
 * `resolveRoute()` (`src/config/site.ts`), que compara de forma exacta contra
 * las seis rutas conocidas justo porque una URL rota no es ninguna de ellas.
 * Son dos preguntas distintas: aquella es «¿qué página del sitio es esta?» (y
 * de una URL rota la respuesta correcta es `null`); esta es «¿en qué rama de
 * idioma estaba navegando quien se ha equivocado?», y de eso el prefijo SÍ es
 * evidencia — `/en/lo-que-sea` solo puede haber salido de un enlace, un
 * marcador o un buscador ingleses.
 *
 * `/en` a secas también cuenta: es la portada inglesa y nunca sirve la 404,
 * pero incluirlo mantiene la guarda alineada con `EN_ROUTES.home` y evita un
 * caso especial que alguien tendría que recordar. Lo que NO cuenta es
 * `/english…` ni `/enlaces`: el prefijo se exige seguido de `/` o como camino
 * completo, nunca como simple `startsWith("/en")`.
 */
export function resolveNotFoundLocale(pathname: string): Locale {
  return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)
    ? "en"
    : DEFAULT_LOCALE;
}

/**
 * Suscripción a los cambios de camino que NO pasan por el router de Next: el
 * botón Atrás/Adelante del navegador (`popstate`). Es lo que mantiene honesto
 * al idioma si alguien llega a `/en/roto`, vuelve atrás a una URL rota
 * castellana y el documento no se recarga.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
  };
}

/** Idioma que declara la URL real del navegador. */
function getSnapshot(): Locale {
  return resolveNotFoundLocale(window.location.pathname);
}

/**
 * Idioma del HTML HORNEADO. Tiene que ser el castellano y no puede leer
 * `window`: es lo que React usa para el render de servidor y para el primer
 * render de la hidratación, y `out/404.html` está horneado en castellano.
 */
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

/**
 * Cáscara de idioma de la 404, resuelta EN CLIENTE a partir de la URL rota.
 *
 * POR QUÉ EN CLIENTE Y NO EN EL BUILD. Bajo `output: "export"` el sitio entero
 * se hornea en ficheros estáticos y existe UN solo `404.html` (`out/404.html`),
 * que el hosting sirve para cualquier ruta inexistente de cualquier rama. No
 * hay servidor Next que pueda mirar la URL pedida y elegir una 404 por idioma:
 * ni middleware, ni Route Handlers, ni `headers()` — la restricción está
 * declarada en `CLAUDE.md` §1. Quien SÍ conoce la URL que falló es el
 * navegador, en tiempo de ejecución, exactamente igual que ya ocurre con la
 * guarda de ruta del script anti-flash del `<head>` (ver el docblock de
 * `buildThemeBootstrapScript`, sección «Tercera pasada»): la información
 * existe, pero solo del lado del cliente.
 *
 * POR QUÉ ARRANCA EN CASTELLANO Y CORRIGE DESPUÉS, y no al revés: el HTML
 * horneado ES castellano, así que el primer render tiene que coincidir con él
 * o el mismatch de hidratación es seguro — de ahí que `getServerSnapshot`
 * devuelva `DEFAULT_LOCALE` y solo `getSnapshot` mire la URL. Es el mismo
 * patrón —y por el mismo motivo— con el que `ThemeProvider` arranca siempre en
 * `"light"` y corrige tras montar.
 *
 * COSTE DECLARADO, no escondido: en una URL rota bajo `/en/` hay un instante de
 * copia castellana antes de que React sustituya la instantánea de servidor por
 * la de cliente. No es evitable sin un servidor o sin duplicar la 404 por
 * idioma (y esto último no es posible: la entrada `/_not-found` resuelve sus
 * ficheros en el segmento raíz de `app/`, fuera de los grupos de idioma, y bajo
 * `output: "export"` el sitio hornea un único `out/404.html` para las dos ramas
 * — ver el docblock de `app/global-not-found.tsx`). El resto de la página SÍ
 * queda coherente:
 * `<html lang>` (lo fija `I18nProvider`), el `<h1>`, el mensaje, el `<title>` y
 * la descripción del documento (`DocumentMeta`), el chrome global (`SkipLink`,
 * `BackToTop`, `Navbar`, `Footer`) y el selector de idioma, que marca como
 * actual el idioma de la instancia activa (`i18n.language === lng`,
 * `LanguageSelector.tsx`) y no una constante.
 *
 * LO QUE ESTA CÁSCARA NO ARREGLABA al nacer, y que la ola I (2026-08-20)
 * cerró después: la salida «Volver al inicio» de `NotFoundContent.tsx` era un
 * `href="/"` literal y desde una 404 inglesa llevaba a la portada castellana.
 * Hoy compone `routePath("home", navLocale(i18n.language))`, así que la 404
 * sale por su propio idioma; este docblock lo afirmaba al revés hasta la
 * integración de la ola K (2026-09-02), que lo puso al día sin tocar código.
 */
export function NotFoundLocaleShell({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  /*
   * `useSyncExternalStore` y no `useState` + `useEffect`, por dos motivos que
   * apuntan al mismo sitio. El de fondo: `location.pathname` es un sistema
   * EXTERNO a React, y este hook es la API que React 19 ofrece para leerlo con
   * una instantánea distinta en servidor (`getServerSnapshot`, el castellano
   * horneado) y en cliente (`getSnapshot`, la URL real) sin arriesgar un
   * mismatch de hidratación. El práctico: la regla
   * `react-hooks/set-state-in-effect` del flat config del repo rechaza un
   * `setState` síncrono dentro de un efecto —cascada de renders—, y este es
   * justo el caso que la regla apunta como alternativa correcta.
   *
   * `getSnapshot` devuelve un STRING, no un objeto nuevo por llamada: React
   * invoca esta función en cada render para comparar, y devolver una
   * referencia nueva cada vez sería un bucle infinito.
   */
  const locale = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return <LocaleShell locale={locale}>{children}</LocaleShell>;
}
