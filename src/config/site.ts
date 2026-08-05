/**
 * Identidad pública del sitio y mapa de rutas.
 *
 * Fuente de verdad ÚNICA para todo lo que necesite saber "dónde vive este
 * sitio y qué páginas tiene": `buildMetadata()`, el JSON-LD, `sitemap.ts`,
 * `robots.ts` y los enlaces internos del footer. Cualquiera de esas piezas
 * que se escriba su propia copia de la URL base terminará divergiendo.
 *
 * `url` NO lleva barra final: `absoluteUrl()` la compone con el `path`, que
 * SÍ empieza por barra. Fijar la convención en un solo sitio evita la familia
 * entera de bugs de doble barra y de canónicas que no coinciden entre el
 * `<link rel="canonical">` y el `sitemap.xml`.
 *
 * Las rutas se declaran SIN barra final y SIN extensión a propósito: con
 * `trailingSlash: false` (next.config.ts) el export estático emite ficheros
 * planos (`out/privacidad.html`), y la URL pública canónica de ese fichero es
 * `/privacidad`. Verificado en el propio paquete instalado
 * (`next/dist/export/worker.js`: `getHtmlFilename = (p) => subFolders ?
 * p + sep + "index.html" : p + ".html"`, con `subFolders = trailingSlash`) y
 * con un build real, no de memoria.
 */
export const SITE = {
  url: "https://voidtoinfinite.com",
  name: "VoidToInfinite",
  /* Locale en el formato de Open Graph (`og:locale`), que usa guion bajo y
     región, no el código corto de i18next. */
  ogLocale: "es_ES",
  lang: "es",
  description:
    "VoidToInfinite es un equipo creativo que construye aprendizaje, imaginacion y juego en una misma travesia. Descubre su historia, su viaje y como participar.",
} as const;

/**
 * Rutas públicas del sitio. La clave es el identificador estable que usan el
 * sitemap, los enlaces y los tests; el valor es la URL relativa canónica.
 */
export const ROUTES = {
  home: "/",
  privacy: "/privacidad",
  terms: "/terminos",
  accessibility: "/accesibilidad",
  legalNotice: "/aviso-legal",
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Las cuatro rutas de documentos legales, en el orden en que se enlazan. */
export const LEGAL_ROUTE_KEYS = [
  "privacy",
  "terms",
  "accessibility",
  "legalNotice",
] as const satisfies readonly RouteKey[];

export type LegalRouteKey = (typeof LEGAL_ROUTE_KEYS)[number];

/**
 * URL absoluta de una ruta interna. `path` debe empezar por barra.
 *
 * La raíz es el único caso especial: `absoluteUrl("/")` devuelve el origen
 * sin barra final, porque `https://voidtoinfinite.com/` y
 * `https://voidtoinfinite.com` son la misma pagina y declarar dos formas
 * distintas entre la canonica y el sitemap es justo lo que un rastreador
 * interpreta como contenido duplicado.
 */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(
      `absoluteUrl espera una ruta que empiece por barra, recibio: "${path}"`,
    );
  }
  return path === "/" ? SITE.url : `${SITE.url}${path}`;
}
