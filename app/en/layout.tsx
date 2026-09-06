import type { Metadata, Viewport } from "next";
import type { ReactElement, ReactNode } from "react";
import { LocaleShell } from "../providers";
import { RootDocument } from "../RootDocument";
import { ROOT_METADATA, ROOT_VIEWPORT } from "../rootMetadata";

/**
 * Rama INGLESA del sitio: `/en`, `/en/privacy`, `/en/legal-notice`
 * (2026-08-18, decisión del dueño «adelante con el copy actual de `en.json`»).
 *
 * `en` SÍ es un segmento real de URL, a diferencia del `(es)` hermano: el
 * prefijo es justamente lo que da al inglés una dirección que se puede
 * compartir, marcar, enlazar e indexar — lo que no tenía cuando el idioma solo
 * vivía en memoria.
 *
 * ES UN ROOT LAYOUT DESDE EL 2026-09-06 y hornea `<html lang="en">`: es el
 * arreglo del P1 de la crítica externa #19 (WCAG 3.1.1, nivel A). Hasta esa
 * fecha las tres rutas de esta rama se servían con `lang="es"` en el HTML en
 * crudo —el contenido, el `<title>`, la canónica y el `hreflang` ya eran
 * ingleses— y solo `I18nProvider` corregía el atributo tras montar. El porqué
 * de que antes no se pudiera, y qué lo desbloquea, está en el docblock de
 * `app/RootDocument.tsx`.
 *
 * Aquí no se duplica ni un componente: las páginas de dentro montan LOS MISMOS
 * `Navbar`/`Hero`/`HomeSections`/`Footer` y el mismo renderer legal que las
 * castellanas, y el documento sale del MISMO `RootDocument` que la rama
 * castellana. Lo único que cambia es el `lang` que recibe y el `locale` de este
 * envoltorio, y con él la instancia de i18next contra la que resuelve cada
 * `t()` del subárbol — así que el inglés está YA en el HTML que hornea el
 * build, no tras hidratar, y `SkipLink`/`BackToTop` (hermanos de `children`
 * dentro de `LocaleShell`) se anuncian también en inglés.
 */

/*
 * `metadata`/`viewport` se asignan desde `app/rootMetadata.ts` y no se declaran
 * aquí: Next solo lee estos exports del FICHERO de la convención, así que las
 * tres raíces del sitio tienen que exportarlos cada una, pero el VALOR es uno
 * solo y compartido. Ver el docblock de ese módulo.
 */
export const metadata: Metadata = ROOT_METADATA;
export const viewport: Viewport = ROOT_VIEWPORT;

export default function EnLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <RootDocument lang="en">
      <LocaleShell locale="en">{children}</LocaleShell>
    </RootDocument>
  );
}
