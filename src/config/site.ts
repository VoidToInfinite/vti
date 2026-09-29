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
/**
 * Los dos idiomas con URL propia (2026-08-18, decisión del dueño «adelante con
 * el copy actual de `en.json`»).
 *
 * Hasta esa fecha el inglés existía SOLO en memoria: `LanguageSelector`
 * conmutaba i18next y nada más — sin URL, así que el inglés no se podía
 * compartir, no se podía marcar, no lo indexaba nadie, `og:locale` decía
 * `es_ES` en todas las páginas y el botón Atrás no deshacía el cambio (no
 * había entrada de historial que deshacer). Anclar el idioma a la URL resuelve
 * las cuatro cosas a la vez.
 *
 * El orden importa: `es` primero porque es el idioma del sitio "sin prefijo"
 * (`/`) y el `x-default` de todas las páginas.
 */
export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Idioma del sitio cuando la URL no dice otra cosa: `/` es castellano. */
export const DEFAULT_LOCALE: Locale = "es";

/**
 * Locale en el formato de Open Graph (`og:locale`), que usa guion bajo y
 * región, no el código corto de i18next.
 *
 * `en_US` y no `en_GB`: el copy inglés de `src/i18n/locales/en/` no declara
 * variante regional, y `en_US` es el valor que Facebook/LinkedIn documentan
 * como inglés genérico. Es una etiqueta de idioma para vistas previas, no una
 * afirmación sobre el público objetivo.
 */
export const OG_LOCALES = {
  es: "es_ES",
  en: "en_US",
} as const satisfies Record<Locale, string>;

export const SITE = {
  url: "https://voidtoinfinite.com",
  name: "VoidToInfinite",
  /* La marca escrita como tres palabras, la forma en que se teclea al
     buscarla. Viaja como `alternateName` de `WebSite` y de `Organization` en
     el JSON-LD (2026-09-28, estrategia SEO "marca primero" decidida por el
     dueño): Google lo lee en `WebSite` de la portada para elegir el nombre del
     sitio (https://developers.google.com/search/docs/appearance/site-names).
     Sin "VTI" a propósito: esas siglas son de otras marcas en buscadores y
     Google puede usar un `alternateName` como nombre visible del sitio. */
  alternateName: "Void to Infinite",
  /* Se conserva como atajo del locale OG de la rama CASTELLANA. El valor por
     ruta sale de `OG_LOCALES[locale]` (ver `buildMetadata`): desde que existen
     rutas `/en/`, `og:locale` ya no es una constante del sitio. */
  ogLocale: OG_LOCALES.es,
  lang: DEFAULT_LOCALE,
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
     (`app/opengraph-image.tsx`), la `description` de su nodo `WebPage` y la
     de `Organization` en el JSON-LD, así que las faltas se leían en el
     resultado de búsqueda y en cada vista previa compartida.

     "EQUIPO" -> "PROYECTO" el 2026-08-15 (barrido de §2 de `PRE-LAUNCH-QA.md`
     contra el `out/` real). No es un matiz de estilo: la decisión de identidad
     de la Fase 0 fue "proyecto creativo", y la Fase 0 también dejó dicho que
     detrás hay UNA persona, no un equipo. La entrega de la Fase 3 propagó esa
     decisión al copy visible -- pasó la voz a singular y cambió `story.body`,
     que decía "un espacio" -- pero se detuvo un nivel antes de llegar aquí, y
     ésta es justo la cadena que un buscador enseña. `PRODUCT.md` §10 punto 11
     ya declaraba la deuda por escrito: "el copy de §1 (`SITE.description`,
     'equipo creativo') no se ha actualizado todavía". Queda saldada.

     Longitud tras el cambio: 158 caracteres, dentro del rango 120-165 que
     §2 exige a la `<meta name="description">`. */
  description:
    "VoidToInfinite es un proyecto creativo que construye aprendizaje, imaginación y juego en una misma travesía. Descubre su historia, su viaje y cómo participar.",
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
 * Las MISMAS tres páginas, en inglés y con slug inglés.
 *
 * El prefijo `/en` es lo que convierte el idioma en una URL compartible; los
 * slugs se traducen también (`/en/privacy`, no `/en/privacidad`) porque una
 * ruta inglesa con sustantivo castellano es exactamente la incoherencia que la
 * crítica midió como P2: el visitante inglés comparte un enlace que se lee a
 * medias en otro idioma, y un buscador lo lee como una señal contradictoria
 * frente al `hreflang="en"` que esa misma página declara.
 *
 * `/en` NO lleva barra final: `trailingSlash: false` (next.config.ts) hace que
 * el export emita `out/en.html`, cuya URL pública canónica es `/en` — misma
 * convención, y mismo motivo, que las rutas castellanas de arriba.
 */
export const EN_ROUTES = {
  home: "/en",
  privacy: "/en/privacy",
  legalNotice: "/en/legal-notice",
} as const satisfies Record<RouteKey, string>;

/** Las seis rutas públicas del sitio, indexadas por idioma y por página. */
export const ROUTES_BY_LOCALE = {
  es: ROUTES,
  en: EN_ROUTES,
} as const satisfies Record<Locale, Record<RouteKey, string>>;

/** Ruta interna de una página en un idioma concreto. */
export function routePath(key: RouteKey, locale: Locale): string {
  return ROUTES_BY_LOCALE[locale][key];
}

/**
 * Mapa `hreflang` → URL absoluta de UNA página, en los dos idiomas más
 * `x-default`.
 *
 * Recíproco por construcción: las seis páginas lo componen con esta misma
 * función, así que la contraparte inglesa de `/privacidad` apunta a
 * `/en/privacy` y la de `/en/privacy` apunta de vuelta a `/privacidad` sin que
 * nadie tenga que acordarse de escribir las dos mitades. Un `hreflang` que no
 * es recíproco Google lo ignora entero — es la forma más habitual de tener
 * las etiquetas puestas y ningún efecto.
 *
 * `x-default` apunta al CASTELLANO porque `/` es la raíz del sitio y el
 * destino correcto para un visitante cuyo idioma no es ninguno de los dos.
 */
export function alternateUrls(key: RouteKey): Record<string, string> {
  return {
    "es": absoluteUrl(ROUTES_BY_LOCALE.es[key]),
    "en": absoluteUrl(ROUTES_BY_LOCALE.en[key]),
    "x-default": absoluteUrl(ROUTES_BY_LOCALE[DEFAULT_LOCALE][key]),
  };
}

/**
 * Idioma e identidad de página de una ruta interna, o `null` si la ruta no es
 * ninguna de las seis (por ejemplo, la URL rota que sirve la 404).
 *
 * Coincidencia EXACTA a propósito, no por prefijo: la única consumidora es
 * `LanguageSelector`, que se renderiza también dentro de `not-found.tsx`, y
 * ahí la ruta de la que parte el prerenderizado (`/_not-found`) NO es la que
 * tendrá el navegador (la URL rota que el visitante pidió). Con coincidencia
 * exacta las dos caen en el mismo `null` y el selector compone el mismo enlace
 * en las dos fases; con coincidencia por prefijo, una URL rota bajo `/en/`
 * daría un `href` distinto en cliente que en el HTML horneado — un mismatch de
 * hidratación en la única página donde nadie lo estaría buscando.
 */
export function resolveRoute(
  pathname: string,
): { readonly key: RouteKey; readonly locale: Locale } | null {
  for (const locale of LOCALES) {
    for (const key of Object.keys(ROUTES) as RouteKey[]) {
      if (ROUTES_BY_LOCALE[locale][key] === pathname) return { key, locale };
    }
  }
  return null;
}

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
 * `vercel.json` redirige las dos rutas retiradas con 301; el porqué de cada
 * destino está en `scripts/build-pipeline.test.mjs`, que ata esas reglas.
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
