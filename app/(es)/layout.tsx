import type { Metadata, Viewport } from "next";
import type { ReactElement, ReactNode } from "react";
import { LocaleShell } from "../providers";
import { RootDocument } from "../RootDocument";
import { ROOT_METADATA, ROOT_VIEWPORT } from "../rootMetadata";

/**
 * Rama CASTELLANA del sitio: `/`, `/privacidad`, `/aviso-legal`.
 *
 * `(es)` es un grupo de ruta — los paréntesis no aparecen en ninguna URL — así
 * que las tres páginas de dentro conservan exactamente las rutas que ya tenían
 * antes de existir el inglés. Ningún enlace, ninguna canónica y ninguna
 * redirección del hosting (hoy `vercel.json`) cambia por esta mudanza.
 *
 * ES UN ROOT LAYOUT DESDE EL 2026-09-06, no un layout anidado: `app/layout.tsx`
 * se retiró para que cada rama pudiera hornear su propio `<html lang>` (WCAG
 * 3.1.1, P1 de la crítica externa #19). Un root layout es, por definición, un
 * `layout` sin `layout` padre, así que este fichero es hoy quien renderiza el
 * documento — lo hace montando `RootDocument`, el cuerpo común que comparten
 * las tres raíces, con `lang="es"`. El porqué completo, con la cita del código
 * de Next que lo desbloquea, vive en el docblock de `app/RootDocument.tsx`.
 *
 * El idioma no se infiere en tiempo de ejecución: lo fija la POSICIÓN del
 * fichero en el árbol, así que el HTML horneado y el primer render del cliente
 * no pueden discrepar.
 *
 * Lo que se monta aquí dentro es `LocaleShell`, no `Providers`: el tema y los
 * estilos globales (que no dependen del idioma) los monta `RootDocument` una
 * sola vez, y eso es lo que impide que el chunk de tema+i18n se emita dos veces
 * —una por esta rama y otra por la 404— en cada página del sitio. La medición
 * está en el docblock de `app/providers.tsx`.
 */

/*
 * `metadata`/`viewport` se asignan desde `app/rootMetadata.ts` y no se declaran
 * aquí: Next solo lee estos exports del FICHERO de la convención, así que las
 * tres raíces del sitio tienen que exportarlos cada una, pero el VALOR es uno
 * solo y compartido. Ver el docblock de ese módulo.
 */
export const metadata: Metadata = ROOT_METADATA;
export const viewport: Viewport = ROOT_VIEWPORT;

export default function EsLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <RootDocument lang="es">
      <LocaleShell locale="es">{children}</LocaleShell>
    </RootDocument>
  );
}
