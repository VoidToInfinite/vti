"use client";

import React, { useEffect, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { DEFAULT_LOCALE, type Locale } from "@/config/site";
import { getI18nInstance } from "./config";

/**
 * EL IDIOMA LO DECIDE LA URL (2026-08-18, decisión del dueño).
 *
 * Hasta esta entrega el idioma vivía SOLO en memoria y se hidrataba desde
 * `localStorage`: el inglés no tenía URL, así que no se podía compartir, no se
 * podía marcar, ningún buscador lo veía y el botón Atrás no deshacía el
 * cambio. Ahora cada ruta declara su idioma (`app/(es)/layout.tsx` y
 * `app/en/layout.tsx` pasan `locale`), y este proveedor entrega la instancia de
 * i18next de ESE idioma — la misma en el HTML horneado y en el cliente, sin
 * ningún cambio de idioma tras hidratar y por tanto sin mismatch posible.
 *
 * SE RETIRÓ LA LECTURA DE `localStorage` QUE DECIDÍA EL IDIOMA, y no es un
 * descuido: conservarla habría significado que un visitante con el inglés
 * guardado viera contenido inglés en `/` — una URL cuya canónica, cuyo
 * `og:locale` y cuyo `hreflang` afirman castellano, y cuyo HTML horneado ES
 * castellano (mismatch de hidratación garantizado en cada carga). Sería
 * reintroducir, por otra puerta, el mismo defecto de "idioma sin URL" que esta
 * entrega cierra. Tampoco se añade una redirección automática por idioma
 * guardado: sorprendería a quien pide `/` a propósito y rompería el Atrás
 * (encargo explícito del dueño).
 *
 * ESTE PROVEEDOR YA NO ESCRIBE NADA EN EL EQUIPO DEL VISITANTE (D3, decisión
 * del dueño, 2026-09-02). Hasta aquí seguía guardando `vti-lang` con el idioma
 * de la ruta, «disponible para cualquier lógica futura». El evaluador Nielsen
 * de la crítica #15 midió lo que eso significaba de verdad: contexto de
 * navegador nuevo, `goto('/')`, CERO interacción, y `localStorage` pasaba de
 * vacío a una única entrada `vti-lang` con valor `es` a los tres segundos —el
 * literal exacto de la clave no se reproduce aquí a propósito: el candado de
 * `storage.test.ts` prohíbe ese literal en todo `src/` fuera de
 * `config/storage.ts`, y un docblock no es excepción. Escritura sin lector —el
 * censo sobre `src/` y `app/` no encontró ni un `getItem` de esa clave— y, lo
 * que la hacía insostenible, escritura sin ELECCIÓN NI NECESIDAD TÉCNICA. La
 * política de privacidad clasificaba entonces todo lo guardado como
 * «preferencias técnicas que guardan una elección hecha por ti», y aterrizar
 * en `/` no es elegir nada. Desde la ola S (2026-09-06) ese texto distingue
 * dos clases —una preferencia que se elige, el tema, y un estado técnico de la
 * sesión, la posición de lectura—, y el idioma escrito al aterrizar no era ni
 * lo uno ni lo otro: nadie lo eligió y nada lo necesitaba. Desde la ola G el
 * idioma vive en la URL (`/` y `/en`), que es donde una elección de idioma sí
 * queda registrada, así que la clave era además redundante.
 *
 * La clave se retira entera: la escritura de aquí, su entrada en
 * `STORAGE_REGISTRY` (`src/config/storage.ts`) y su fila en la tabla «Qué
 * guardamos en tu equipo» de la política de privacidad, que se pinta desde ese
 * mismo registro. El candado que impide que vuelva a colarse vive en
 * `I18nProvider.test.tsx` (espía sobre `localStorage.setItem`) y en
 * `storage.test.ts` (`vti-lang` no reaparece en el registro).
 */
function syncDocumentLang(lang: string): void {
  if (typeof document === "undefined") return;
  /*
   * QUÉ CORRIGE ESTO HOY, y ya no es lo que corregía (2026-09-06, ola S).
   *
   * HASTA ESA FECHA: `app/layout.tsx` era el ÚNICO root layout del proyecto y
   * horneaba siempre `lang="es"`, así que esta línea era el único mecanismo
   * que ponía `en` en `/en/*` — y solo tras montar, con el HTML servido en
   * crudo quedándose en `es`. Estaba declarado como límite conocido: bajo App
   * Router, dos `<html lang>` distintos exigen dos root layouts (es decir,
   * que no exista `app/layout.tsx`), y eso lo bloqueaba la 404 propia del
   * repo, cuya entrada `/_not-found` resolvía su `layout` en el segmento raíz.
   *
   * HOY: el sitio tiene TRES raíces —`app/(es)/layout.tsx` con `lang="es"`,
   * `app/en/layout.tsx` con `lang="en"` y `app/global-not-found.tsx`— que
   * montan el documento común `app/RootDocument.tsx` pasándole su idioma, así
   * que las tres rutas inglesas ya se SIRVEN con `lang="en"` en el HTML en
   * crudo (P1 de la crítica externa #19, WCAG 3.1.1 nivel A). Lo que lo
   * desbloqueó —`experimental.globalNotFound` y la cita del código de Next
   * 16.2.11— está en el docblock de `app/RootDocument.tsx`.
   *
   * POR QUÉ SIGUE HACIENDO FALTA: la 404. Bajo `output: "export"` hay un
   * único `out/404.html` para las dos ramas y su contenido horneado es
   * castellano, así que `app/global-not-found.tsx` hornea `lang="es"` a
   * propósito; en una URL rota bajo `/en/`, `NotFoundLocaleShell` resuelve el
   * idioma desde el camino y ESTA línea es la que escribe `en` en el DOM vivo
   * —que es lo que anuncia un lector de pantalla— tras montar. En las seis
   * rutas normales ya no corrige nada: reescribe el mismo valor que el
   * documento trae horneado, que es exactamente lo que se quiere (una sola
   * fuente para el idioma, la ruta, sin ramas que puedan discrepar).
   */
  document.documentElement.lang = lang;
}

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  /** Idioma de la ruta que monta este proveedor. */
  locale?: Locale;
  children: React.ReactNode;
}): ReactElement {
  const instance = getI18nInstance(locale);

  useEffect(() => {
    syncDocumentLang(locale);
  }, [locale]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
