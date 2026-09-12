import type { MetadataRoute } from "next";
import {
  LEGAL_ROUTE_KEYS,
  LOCALES,
  absoluteUrl,
  alternateUrls,
  routePath,
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

// Fecha de la última revisión de CONTENIDO real del sitemap, no la fecha del
// build. A propósito NO se usa `new Date()`: eso cambiaría el sitemap entero
// en cada build y le diría a Google que las cinco páginas se modificaron hoy
// cuando no es cierto — el propio motor de rastreo usa `lastModified` para
// decidir cuándo re-rastrear, y un valor que miente todos los días degrada
// esa señal a ruido. Se actualiza a mano cuando el contenido cambie de
// verdad.
/* 2026-08-13, no 2026-08-08: las dos páginas legales cambiaron de contenido
   sustantivo ese día (identidad del responsable, cadena de proveedores del
   correo, plazo de conservación; ver `LEGAL_VERSIONS` 3.0.0). Dejarla en el 8
   habría dicho a los rastreadores que no había nada nuevo que leer, que es
   exactamente el ruido que este comentario pide evitar en el otro sentido.
   Lo cazó el candado de `sitemap.test.ts`, no una revisión a ojo. */
const SITEMAP_LAST_MODIFIED = "2026-08-13";

/** Las tres páginas públicas: home + las dos legales, en ese orden. */
const SITEMAP_ROUTE_KEYS = ["home", ...LEGAL_ROUTE_KEYS] as const;

/*
 * SEIS URLs desde el 2026-08-18, no tres: cada página × cada idioma.
 *
 * Un sitemap que solo listara las castellanas sería exactamente el defecto que
 * la crítica midió tres veces seguidas —el inglés no se indexa— con las rutas
 * ya publicadas: un rastreador solo descubre lo que le enseñas o lo que
 * encuentra enlazado, y hasta esta entrega no había ni una cosa ni la otra.
 *
 * Cada entrada lleva además `alternates.languages` con las TRES claves (`es`,
 * `en`, `x-default`), la propia incluida. Next lo emite como `<xhtml:link
 * rel="alternate" hreflang="…">` dentro de cada `<url>`, que es el mecanismo
 * que la documentación de Google describe para declarar versiones por idioma
 * desde el sitemap — el mismo grupo recíproco que ya viaja en el `<head>` de
 * cada página, y compuesto por la MISMA función (`alternateUrls`), así que las
 * dos declaraciones no pueden contradecirse.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return LOCALES.flatMap((locale) =>
    SITEMAP_ROUTE_KEYS.map((key) => ({
      url: absoluteUrl(routePath(key, locale)),
      lastModified: SITEMAP_LAST_MODIFIED,
      // Google ignora `changeFrequency` y `priority` desde hace años (lo
      // confirma su propia documentación de Search Central) — se declaran
      // porque el formato del sitemap los admite y sirven como documentación
      // legible de la intención, no porque muevan el rastreo.
      changeFrequency:
        key === "home" ? ("monthly" as const) : ("yearly" as const),
      priority: key === "home" ? 1 : 0.3,
      alternates: { languages: alternateUrls(key) },
    })),
  );
}
