import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";

// OBLIGATORIO con `output: "export"` (H1, la misma razón que en
// `app/sitemap.ts`, verificado con el paquete instalado y con un build
// real): sin esta línea, el build falla con exactamente este mensaje —
//   export const dynamic = "force-static"/export const revalidate not
//   configured on route "/robots.txt" with "output: export".
// (`node_modules/next/dist/server/route-modules/app-route/module.js:153`).
// No la borres "para limpiar": es la línea cuyo olvido rompe el export
// estático, y `robots.test.ts` la ata por eso.
export const dynamic = "force-static";

/**
 * Sin `Disallow` decorativo y SIN bloquear rastreadores de IA (GPTBot,
 * ClaudeBot, PerplexityBot…). El encargo pide SEO con AEO/GEO/AIO —
 * visibilidad en motores de búsqueda GENERATIVOS — y bloquear esos
 * rastreadores es exactamente lo contrario de lo que se pidió. Si algún día
 * hay una razón concreta para excluir un rastreador, que sea una decisión
 * deliberada y documentada aquí, no un `Disallow` copiado por costumbre.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
