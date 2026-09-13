import type { MetadataRoute } from "next";
import { LEGAL_VERSIONS } from "@/config/legal";
import {
  LEGAL_ROUTE_KEYS,
  LOCALES,
  absoluteUrl,
  routePath,
  type RouteKey,
} from "@/config/site";

// OBLIGATORIO con `output: "export"` (H1, verificado con el paquete
// instalado y con un build real): sin esta línea, el build falla con
// exactamente este mensaje —
//   export const dynamic = "force-static"/export const revalidate not
//   configured on route "/sitemap.xml" with "output: export".
// (`node_modules/next/dist/server/route-modules/app-route/module.js:153`).
// El wrapper autogenerado de la ruta (`next-metadata-route-loader.js`) NO
// inyecta este flag por sí solo para `sitemap.ts`/`robots.ts` — solo lo hace
// para assets estáticos literales. No la borres "para limpiar": es la línea
// cuyo olvido rompe el export estático, y `sitemap.test.ts` la ata por eso.
export const dynamic = "force-static";

/*
 * `lastModified` es la fecha del último cambio de CONTENIDO de cada página, no
 * la del build. A propósito NO se usa `new Date()`: cambiaría el sitemap entero
 * en cada build y le diría a Google que todo se modificó hoy. Google lo dice
 * así: usa `<lastmod>` «if it's consistently and verifiably (for example by
 * comparing to the last modification of the page) accurate»
 * (developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
 *
 * UNA fecha por página desde el 2026-09-13, no una constante para las seis. La
 * constante única (`2026-08-13`) llevaba un mes mintiendo en los dos sentidos:
 * las tres rutas inglesas nacieron el 2026-08-18 (`1f89ec6`), cinco días DESPUÉS
 * de la fecha que declaraban, y tanto la portada como la privacidad cambiaron
 * de texto en septiembre sin que el sitemap se enterase (auditoría del sitemap
 * para Search Console, 2026-09-13).
 *
 * - Las legales leen `LEGAL_VERSIONS[key].updated`: la MISMA fecha que pintan
 *   su `<h1>` y su JSON-LD (`dateModified`), así que las tres declaraciones no
 *   pueden divergir. Antes el sitemap tenía su propia copia y un test que solo
 *   exigía «no anterior a».
 * - La portada no tiene versión propia, así que su fecha se escribe aquí a
 *   mano. Se mueve cuando cambia el texto que la portada enseña (copy de
 *   `home.json` o de las secciones), no por un retoque de estilo o de
 *   movimiento.
 */
/* 2026-09-13: el bloque de hechos de About estrena el texto del dueño en cinco
   párrafos, en los dos idiomas (`8222aa6`). */
const HOME_LAST_MODIFIED = "2026-09-13";

/** Las tres páginas públicas: home + las dos legales, en ese orden. */
const SITEMAP_ROUTE_KEYS = ["home", ...LEGAL_ROUTE_KEYS] as const;

/** Fecha de último cambio de contenido de una página, igual en los dos idiomas. */
function pageLastModified(key: RouteKey): string {
  return key === "home" ? HOME_LAST_MODIFIED : LEGAL_VERSIONS[key].updated;
}

/*
 * SEIS URLs desde el 2026-08-18, no tres: cada página × cada idioma.
 *
 * Un sitemap que solo listara las castellanas sería exactamente el defecto que
 * la crítica midió tres veces seguidas —el inglés no se indexa— con las rutas
 * ya publicadas: un rastreador solo descubre lo que le enseñas o lo que
 * encuentra enlazado, y hasta esta entrega no había ni una cosa ni la otra.
 *
 * SIN `alternates` desde el 2026-09-13, y a propósito. Del 2026-08-18 a esa
 * fecha cada entrada llevaba `alternates.languages`, que Next emite como
 * `<xhtml:link rel="alternate" hreflang="…">`. Con ellos el sitemap servido no
 * validaba contra el esquema oficial (`sitemaps.org/schemas/sitemap/0.9/
 * sitemap.xsd`): medido con el validador de .NET, 24 errores. Dos causas, y la
 * primera no tiene arreglo desde aquí: Next escribe los `xhtml:link` justo
 * detrás de `<loc>` y antes de `<lastmod>`, con el orden fijado en su
 * serializador (`next/dist/build/webpack/loaders/metadata/
 * resolve-route-data.js`), cuando el esquema exige los elementos de otro
 * espacio de nombres al FINAL; y aun reordenados quedaban 18 errores, porque el
 * esquema los procesa en modo estricto y no trae declaración para `xhtml:link`.
 * Sin ellos, 0 errores.
 *
 * No se pierde la declaración de idioma: el grupo recíproco `es`/`en`/
 * `x-default` sigue viajando en el `<head>` de las seis páginas, compuesto por
 * `alternateUrls` en `buildMetadata()` y atado por `metadata.test.ts`. Y las
 * tres URLs inglesas siguen aquí como `<loc>` propio, que es lo que hace que un
 * rastreador las descubra. Decisión del dueño en la auditoría del 2026-09-13.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    SITEMAP_ROUTE_KEYS.map((key) => ({
      url: absoluteUrl(routePath(key, locale)),
      lastModified: pageLastModified(key),
      // Google ignora `changeFrequency` y `priority` desde hace años (lo
      // confirma su propia documentación de Search Central) — se declaran
      // porque el formato del sitemap los admite y sirven como documentación
      // legible de la intención, no porque muevan el rastreo.
      changeFrequency:
        key === "home" ? ("monthly" as const) : ("yearly" as const),
      priority: key === "home" ? 1 : 0.3,
    })),
  );
}
