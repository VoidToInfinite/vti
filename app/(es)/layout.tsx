import type { ReactElement, ReactNode } from "react";
import { LocaleShell } from "../providers";

/**
 * Rama CASTELLANA del sitio: `/`, `/privacidad`, `/aviso-legal`.
 *
 * `(es)` es un grupo de ruta — los paréntesis no aparecen en ninguna URL — así
 * que las tres páginas de dentro conservan exactamente las rutas que ya tenían
 * antes de existir el inglés. Ningún enlace, ninguna canónica y ninguna
 * redirección de `netlify.toml` cambia por esta mudanza.
 *
 * Existe por una sola razón: dar a las rutas castellanas un layout PROPIO que
 * pueda montar el idioma. `app/layout.tsx` no puede hacerlo — lo comparten los
 * dos idiomas y no recibe nada que le diga cuál está renderizando (ver el
 * docblock de `app/providers.tsx`). Aquí el idioma no se infiere en tiempo de
 * ejecución: lo fija la POSICIÓN del fichero en el árbol, así que el HTML
 * horneado y el primer render del cliente no pueden discrepar.
 *
 * Lo que se monta aquí es `LocaleShell`, no `Providers`: el tema y los estilos
 * globales (que no dependen del idioma) los monta el root layout una sola vez,
 * y eso es lo que impide que el chunk de tema+i18n se emita dos veces —una por
 * esta rama y otra por `/_not-found`— en cada página del sitio. La medición
 * está en el docblock de `app/providers.tsx`.
 */
export default function EsLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <LocaleShell locale="es">{children}</LocaleShell>;
}
