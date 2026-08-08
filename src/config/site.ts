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
  /**
   * Título de la HOME, sin la marca: `buildMetadata()` le añade el sufijo
   * ` · VoidToInfinite` (entrega 2026-08-05).
   *
   * Antes, la home pasaba `SITE.name` como título, lo que activaba el caso
   * especial de `buildMetadata()` (título === marca → sin sufijo) y dejaba el
   * `<title>` de la página más importante del sitio en la marca desnuda,
   * "VoidToInfinite": cero palabras sobre QUÉ es el sitio, ni en la pestaña
   * del navegador ni en el enlace azul de un resultado de búsqueda, ni en el
   * `og:title` de una vista previa compartida (los tres salen del mismo
   * valor). El texto no se inventa: son las tres palabras que la propia
   * `description` de aquí abajo ya usa para describir el proyecto, y que las
   * secciones de la home desarrollan (Learning / Imagination / Gaming).
   */
  homeTitle: "Aprendizaje, imaginación y juego",
  /* Acentos corregidos el 2026-08-05: decía "imaginacion", "travesia" y
     "como". Esta cadena NO es solo interna -- es la `<meta name="description">`
     y el `og:description` de la home, el subtítulo de la imagen Open Graph
     (`app/opengraph-image.tsx`) y la `description` de su nodo `WebPage`, así
     que las faltas se leían en el resultado de búsqueda y en cada vista
     previa compartida. */
  description:
    "VoidToInfinite es un equipo creativo que construye aprendizaje, imaginación y juego en una misma travesía. Descubre su historia, su viaje y cómo participar.",
} as const;

/**
 * Rutas públicas del sitio. La clave es el identificador estable que usan el
 * sitemap, los enlaces y los tests; el valor es la URL relativa canónica.
 */
export const ROUTES = {
  home: "/",
  privacy: "/privacidad",
  legalNotice: "/aviso-legal",
} as const;

export type RouteKey = keyof typeof ROUTES;

/**
 * Las dos rutas de documentos legales, en el orden en que se enlazan.
 *
 * Fueron CUATRO hasta el 2026-08-08. `/terminos` y `/accesibilidad` se
 * retiraron en la revisión legal de esa fecha, y su ausencia no es un descuido
 * ni una simplificación estética:
 *
 * - unos términos de uso regulan una relación contractual, y este sitio no
 *   contrata nada (ni venta, ni registro, ni cuentas, ni suscripciones, ni
 *   contenido de usuario). Sus únicas cláusulas con sentido aquí —uso
 *   permitido, propiedad intelectual, responsabilidad, enlaces a terceros y
 *   ley aplicable— viven ahora dentro del Aviso legal, que es su sitio natural;
 * - la declaración de accesibilidad la exige el RD 1112/2018 al SECTOR
 *   PÚBLICO, y este sitio no lo es. Publicarla era voluntario. Retirar la
 *   PÁGINA no retira ni un solo requisito de accesibilidad del propio sitio,
 *   que sigue desarrollándose contra WCAG 2.2 AA.
 *
 * `netlify.toml` redirige las dos rutas retiradas; ver allí el porqué de cada
 * destino.
 */
export const LEGAL_ROUTE_KEYS = [
  "privacy",
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
