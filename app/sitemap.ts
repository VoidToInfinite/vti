import type { MetadataRoute } from "next";
import { ROUTES, LEGAL_ROUTE_KEYS, absoluteUrl } from "@/config/site";

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
const SITEMAP_LAST_MODIFIED = "2026-08-04";

/** Las cinco rutas públicas: home + las cuatro páginas legales, en ese orden. */
const SITEMAP_ROUTE_KEYS = ["home", ...LEGAL_ROUTE_KEYS] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_ROUTE_KEYS.map((key) => ({
    url: absoluteUrl(ROUTES[key]),
    lastModified: SITEMAP_LAST_MODIFIED,
    // Google ignora `changeFrequency` y `priority` desde hace años (lo
    // confirma su propia documentación de Search Central) — se declaran
    // porque el formato del sitemap los admite y sirven como documentación
    // legible de la intención, no porque muevan el rastreo.
    changeFrequency: key === "home" ? "monthly" : "yearly",
    priority: key === "home" ? 1 : 0.3,
  }));
}
