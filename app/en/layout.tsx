import type { ReactElement, ReactNode } from "react";
import { Providers } from "../providers";

/**
 * Rama INGLESA del sitio: `/en`, `/en/privacy`, `/en/legal-notice`
 * (2026-08-18, decisión del dueño «adelante con el copy actual de `en.json`»).
 *
 * `en` SÍ es un segmento real de URL, a diferencia del `(es)` hermano: el
 * prefijo es justamente lo que da al inglés una dirección que se puede
 * compartir, marcar, enlazar e indexar — lo que no tenía cuando el idioma solo
 * vivía en memoria.
 *
 * Aquí no se duplica ni un componente: las páginas de dentro montan LOS MISMOS
 * `Navbar`/`Hero`/`HomeSections`/`Footer` y el mismo renderer legal que las
 * castellanas. Lo único que cambia es el `locale` de este proveedor, y con él
 * la instancia de i18next contra la que resuelve cada `t()` del subárbol — así
 * que el inglés está YA en el HTML que hornea el build, no tras hidratar.
 */
export default function EnLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <Providers locale="en">{children}</Providers>;
}
