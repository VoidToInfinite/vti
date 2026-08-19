import type { Metadata } from "next";
import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { NotFoundContent } from "@/components/sections/NotFound/NotFoundContent";
import { SITE } from "@/config/site";
import esCommon from "@/i18n/locales/es/common.json";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { TITLE_SEPARATOR } from "@/seo/metadata";
import { NotFoundLocaleShell } from "./NotFoundLocaleShell";

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
 * el rastreador siga los enlaces del sitio (`follow: true` -- desde la
 * auditoria premium 2026-08-08 la plantilla SI incluye navegacion: el
 * enlace "Volver al inicio" que `NotFoundContent` monta dentro de su
 * `<main>`, el unico enlace que esta pagina lleva), pero NUNCA debe
 * indexarse como resultado de busqueda -- indexar paginas de error diluye
 * la relevancia del dominio.
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

/*
 * Task 35 (hallazgo de un evaluador independiente, gate F4, 2026-08-12):
 * esta cáscara pasa de montar SOLO `NotFoundContent` a montar también
 * `Navbar` y `Footer` -- los MISMOS componentes que `app/page.tsx`, sin
 * duplicar lógica. Server Component + Client Components hijos es
 * exactamente el mismo patrón que ya usa `app/page.tsx` (`HomePage` no
 * lleva "use client" y monta `Navbar`/`Footer`, los dos de cliente,
 * directamente).
 *
 * Divergencia DELIBERADA con `/privacidad` y `/aviso-legal`: esas dos rutas
 * usan `LegalHeader` (cabecera sobria, sin anclas de sección) en vez del
 * `Navbar` de la home -- su propio docblock (`LegalHeader.tsx`) explica por
 * qué: `Navbar` monta 4 anclas a secciones (`#story`/`#journey`/
 * `#features`/`#contact`, `src/config/navigation.ts`) que en una página sin
 * esas secciones quedan muertas (no navegan a ningún sitio; el navegador
 * simplemente no encuentra el ancla y no hace scroll). Ese mismo argumento
 * aplica aquí igual de literalmente -- la 404 tampoco monta esas 4
 * secciones --, pero el brief de esta tarea pide explícitamente "los mismos
 * componentes que la home", con la marca completa, el selector de idioma,
 * el conmutador de tema Y la navegación entera visibles -- priorizando que
 * quien aterriza en un error de verdad vea el sitio COMPLETO y pueda saltar
 * a cualquier destino real (SDK, Discord, GitHub, las 4 anclas SI vuelve a
 * la home), aunque mientras siga en esta ruta las 4 anclas de sección no
 * resuelvan nada -- el mismo trade-off, sin gravedad añadida, que ya asume
 * cualquier enlace del `Footer` de la home a esas mismas anclas cuando se
 * clica desde `/privacidad`. Decisión del brief de la tarea, no una omisión
 * de este cambio.
 */
export default function NotFound(): ReactElement {
  return (
    /*
     * `LocaleShell` (el IDIOMA, con `SkipLink`/`BackToTop`) se monta AQUÍ desde
     * el 2026-08-18. Esta página tiene que seguir viviendo en la raíz de `app/`
     * para ser la 404 global (la entrada `/_not-found` resuelve sus ficheros en
     * el segmento raíz, no dentro de los grupos de ruta), así que no cae dentro
     * de `app/(es)/` ni de `app/en/` y no hereda el idioma de ninguno de los
     * dos.
     *
     * EL `locale="es"` FIJO SE RETIRA EL 2026-08-20 (crítica #13). Decía que
     * «una URL rota no pertenece a ninguna rama de idioma», y eso es falso en
     * cuanto el sitio tiene dos: `GET /en/lo-que-sea` respondía 404 correcto
     * pero enteramente en castellano —`<html lang="es">`, título «Página no
     * encontrada», cuerpo castellano y el selector marcando Español como
     * actual— a alguien que venía navegando en inglés. La rama SÍ está en la
     * URL que falló, y `NotFoundLocaleShell` la lee del navegador tras montar:
     * el porqué completo, el motivo de que arranque en castellano y el coste
     * declarado (un instante de copia castellana antes de corregir) viven en su
     * docblock, no se duplican aquí.
     *
     * El TEMA y los estilos globales NO se montan aquí: los pone `Providers` en
     * `app/layout.tsx`, que también envuelve a esta página. Desde el 2026-08-19
     * eso no es un detalle de gusto — el árbol de esta ruta viaja en el
     * manifiesto de cliente de TODAS las páginas (es su `NotFoundBoundary`), así
     * que cada módulo que se monte aquí y no cuelgue de un ancestro común se
     * emite por duplicado y lo descarga también quien solo abre la portada.
     * Medido: 313.928 → 285.430 B brotli (docblock de `app/providers.tsx`).
     */
    <NotFoundLocaleShell>
      {/*
       * Mismo mecanismo que la home y que las dos legales (crítica externa
       * #8): la `metadata` de arriba se hornea en castellano en build y nada
       * la actualizaba al cambiar de idioma, así que el `<h1>` traducido y la
       * pestaña afirmaban idiomas distintos. Las claves son las MISMAS que ya
       * consume esa `metadata` (`notFound.title`/`notFound.message`) y las
       * mismas que pinta `NotFoundContent`: una sola fuente para el titular,
       * la pestaña y la descripción. Ver `src/seo/useDocumentMeta.ts`.
       */}
      <DocumentMeta
        titleKey="notFound.title"
        descriptionKey="notFound.message"
      />
      <Navbar />
      <NotFoundContent />
      <Footer />
    </NotFoundLocaleShell>
  );
}
