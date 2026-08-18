"use client";

import React, { useEffect, type ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { DEFAULT_LOCALE, type Locale } from "@/config/site";
import { STORAGE_KEYS } from "@/config/storage";
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
 * `vti-lang` SIGUE ESCRIBIÉNDOSE, con el idioma de la ruta en la que el
 * visitante está. Es la preferencia observada, sigue declarada en
 * `STORAGE_REGISTRY` (y por tanto en la tabla de la política de privacidad,
 * que tiene que ser exacta) y queda disponible para cualquier lógica futura.
 * Hoy NADIE la lee: eso está declarado en el informe de la entrega, no
 * escondido aquí.
 */
function syncDocumentLang(lang: string): void {
  if (typeof document === "undefined") return;
  /*
   * `app/layout.tsx` es el ÚNICO root layout del proyecto y hornea siempre
   * `lang="es"`: bajo App Router, dos `<html lang>` distintos exigen dos root
   * layouts (grupos de ruta sin `app/layout.tsx`), y eso está bloqueado por el
   * `app/not-found.tsx` propio del repo — ver el docblock de `app/layout.tsx`
   * para el porqué, con la cita del código de Next. Mientras siga así, ESTE es
   * el único mecanismo que corrige el atributo en `/en/*`, y corre tras montar:
   * los lectores de pantalla leen el DOM vivo, así que anuncian el inglés con
   * fonética inglesa (WCAG 3.1.1); el HTML servido en crudo se queda en `es` y
   * eso está declarado como límite conocido, no como algo resuelto.
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
    // Escribir en `localStorage` durante el render rompería el export estático
    // (no hay `window` al hornear); tras montar es el patrón seguro de siempre,
    // el mismo que usa `ThemeProvider` para su propia clave.
    window.localStorage.setItem(STORAGE_KEYS.lang, locale);
  }, [locale]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
