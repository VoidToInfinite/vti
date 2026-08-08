import type { Metadata } from "next";
import type { ReactElement } from "react";
import { NotFoundContent } from "@/components/sections/NotFound/NotFoundContent";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { TITLE_SEPARATOR } from "@/seo/metadata";

/*
 * Server Component a proposito, SIN "use client" (auditoria SEO 2026-08-08,
 * mismo patron que las paginas legales -- ver el docblock de
 * `app/privacidad/page.tsx`): una ruta que exporta `metadata` no puede ser
 * Client Component. Antes de esta entrega, `not-found.tsx` era enteramente
 * de cliente y heredaba la metadata de la HOME (`app/layout.tsx`): el
 * `<title>` de la 404 era el de la home, `robots` quedaba en
 * `index,follow` -- justo lo contrario de lo que una pagina de error
 * deberia declarar -- y la canonica apuntaba a `/`, no a la URL rota que el
 * visitante pidio de verdad.
 *
 * `robots.index: false` es la pieza central: una 404 SI debe permitir que
 * el rastreador siga los enlaces del sitio (`follow: true`, por si la
 * plantilla llegase a incluir navegacion), pero NUNCA debe indexarse como
 * resultado de busqueda -- indexar paginas de error diluye la relevancia
 * del dominio.
 *
 * `alternates.canonical: null` es una anulacion DELIBERADA, no una omision:
 * en la metadata de Next un campo de primer nivel que el hijo NO declara se
 * HEREDA del padre (`app/layout.tsx` declara la canonica de la home), asi
 * que omitir `alternates` dejaba a la 404 emitiendo
 * `<link rel="canonical" href="https://voidtoinfinite.com">` -- medido en
 * `out/404.html` el 2026-08-08. Declarar el campo con `null` sustituye la
 * herencia y suprime la etiqueta: una 404 no tiene URL propia que
 * canonicalizar. Tampoco se declaran `openGraph`/`twitter` (por eso NO se
 * usa `buildMetadata()`, que los construye siempre completos): no tiene
 * sentido compartir un "resultado" que no es una pagina real del sitio.
 *
 * La copia sale del locale ESPAÑOL directamente, no vía `t()`: `metadata`
 * se resuelve en tiempo de build, sobre el HTML prerrenderizado en español
 * (`src/i18n/config.ts`: `lng: "es"`) -- mismo criterio que
 * `app/privacidad/page.tsx`, mismo motivo (que el `<title>` del HTML
 * estatico y el `<h1>` que monta `NotFoundContent` no puedan divergir).
 */
export const metadata: Metadata = {
  title: `${esCommon.notFound.title}${TITLE_SEPARATOR}${SITE.name}`,
  description: esCommon.notFound.message,
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound(): ReactElement {
  return <NotFoundContent />;
}
