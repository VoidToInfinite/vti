import type { Metadata } from "next";
import {
  LOCALES,
  OG_LOCALES,
  SITE,
  absoluteUrl,
  alternateUrls,
  routePath,
  type Locale,
  type RouteKey,
} from "@/config/site";

/**
 * Separador entre el título de página y el nombre del sitio. Se exporta como
 * constante (en vez de dejar " · " escrito a mano en cada sitio que compone
 * un título) para que `metadata.test.ts` pueda componer el título esperado
 * sin duplicar el carácter exacto — si el separador cambia algún día, cambia
 * en un solo sitio y el test lo sigue automáticamente.
 */
export const TITLE_SEPARATOR = " · ";

/**
 * Ruta de la imagen Open Graph que genera `app/opengraph-image.tsx`.
 *
 * Se declara aquí, EXPLÍCITAMENTE, corrigiendo la decisión D4 original de la
 * spec ("no declarar `openGraph.images`, ya la inyecta la convención de
 * fichero"). D4 se apoyaba en una verificación incompleta: se comprobó que la
 * imagen sobrevivía al reemplazo de H2 en una página del MISMO segmento que
 * el fichero de imagen (`app/page.tsx` junto a `app/opengraph-image.tsx`), y
 * se generalizó a las rutas anidadas sin volver a medir.
 *
 * Medido en el build real de esta entrega, que es lo que la corrige: el HTML
 * de `/` sí llevaba `og:image` y `twitter:image`, y el de las CUATRO páginas
 * legales NO llevaba ninguno de los dos. La explicación encaja exactamente
 * con H2: para una ruta anidada, la imagen del convenio entra en el
 * `openGraph` YA RESUELTO del segmento padre, y el `openGraph` que la página
 * declara lo sustituye entero -- imagen incluida. En la raíz no pasa porque
 * ahí la imagen pertenece al propio segmento.
 *
 * `metadataBase` (el valor único de `ROOT_METADATA`, `app/rootMetadata.ts`,
 * que las tres raíces del sitio re-exportan desde el 2026-09-06; antes se
 * declaraba en `app/layout.tsx`) es lo que convierte esta ruta relativa en
 * absoluta; sin él, `og:image` saldría relativa y ningún rastreador la
 * seguiría.
 */
export const OG_IMAGE_PATH = "/opengraph-image";

/** Dimensiones reales del PNG que emite `app/opengraph-image.tsx`. */
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Compone el `<title>` completo de una página: su título propio más el
 * nombre del sitio, separados por `TITLE_SEPARATOR`.
 *
 * Se extrae de `buildMetadata()` (donde vivía inline) porque desde la ola D
 * hay un SEGUNDO consumidor de la misma plantilla: `useDocumentMeta()`, que
 * reescribe `document.title` en cliente cuando el visitante cambia de idioma
 * (bajo `output: "export"` la metadata se hornea una sola vez, en castellano
 * — ver el docblock de `useDocumentMeta.ts`). Los dos caminos tienen que
 * producir EXACTAMENTE el mismo formato: si divergieran, el título cambiaría
 * de forma al cambiar de idioma sin que nadie lo pidiera. Una función pura
 * compartida es la única manera de que no puedan divergir.
 *
 * El caso especial `title === SITE.name` evita "VoidToInfinite ·
 * VoidToInfinite". Hoy ninguna ruta lo ejerce (la home pasa por
 * `SITE.homeTitle` desde el 2026-08-05), pero se conserva porque la
 * condición que lo motivó sigue siendo posible.
 */
export function pageTitle(title: string): string {
  return title === SITE.name
    ? SITE.name
    : `${title}${TITLE_SEPARATOR}${SITE.name}`;
}

export interface BuildMetadataInput {
  /**
   * Identidad de la PÁGINA, no su ruta. Desde que existen rutas `/en/`
   * (2026-08-18) la misma página tiene dos URLs, y el constructor necesita
   * conocer las DOS para emitir el `hreflang` recíproco — no solo la de la
   * ruta que se está construyendo. Pasar una ruta suelta no permitiría
   * derivar la contraparte.
   */
  readonly routeKey: RouteKey;
  /** Idioma de ESTA ruta: decide la canónica, el `og:locale` y el `hreflang` propio. */
  readonly locale: Locale;
  /** Título de la página SIN sufijo de marca. */
  readonly title: string;
  readonly description: string;
  readonly keywords?: readonly string[];
}

/**
 * Constructor único de `Metadata` para TODAS las rutas del sitio (home y las
 * cuatro páginas legales). Existe por un motivo medido, no por preferencia
 * de estilo: en Next 16.2.11 con `output: "export"`, el objeto `openGraph`
 * NO se fusiona entre el root layout de la rama —`app/(es)/layout.tsx` o
 * `app/en/layout.tsx` desde el 2026-09-06; hasta entonces, el `app/layout.tsx`
 * único— y el `page.tsx` de cada ruta: el resolver de metadata SUSTITUYE la
 * clave entera del padre por la del hijo.
 *
 * Evidencia en el propio paquete instalado,
 * `node_modules/next/dist/lib/metadata/resolve-metadata.js`, dentro de
 * `mergeMetadata` (declarada en la línea 166): el `case 'openGraph'` (líneas
 * 182-186) hace
 *
 *   newResolvedMetadata.openGraph = convertUrlsToStrings(
 *     await resolveOpenGraph(metadata.openGraph, ...)
 *   );
 *
 * — es decir, RESUELVE `metadata.openGraph` (solo el objeto declarado por el
 * segmento actual) y lo asigna entero, sin partir de ni mezclar con
 * `newResolvedMetadata.openGraph` (el clon heredado del padre, línea 167).
 * Si una página declara `openGraph: { title }`, todo lo demás que puso el
 * layout (`og:site_name`, `og:type`…) desaparece del HTML. Verificado además
 * con un build real: un layout con `openGraph:{title,description,type,
 * siteName,images}` y una página con `openGraph:{title}` produce HTML sin
 * `og:site_name` ni `og:type` — `og:description` sobrevive solo por un
 * fallback puntual desde el `description` de nivel raíz
 * (`postProcessMetadata`, línea 619), no por merge.
 *
 * Por eso NINGUNA página escribe su propio objeto `openGraph`/`twitter`:
 * todas pasan por `buildMetadata()`, que siempre devuelve los dos objetos
 * COMPLETOS. Escribirlo a mano en 5 sitios garantizaría divergencia el día
 * que alguien edite uno y olvide los otros cuatro.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { routeKey, locale, title, description, keywords } = input;

  // `absoluteUrl` ya valida que la ruta empiece por barra y lanza si no —
  // reutilizamos esa validación en vez de duplicarla aquí.
  const url = absoluteUrl(routePath(routeKey, locale));

  const fullTitle = pageTitle(title);

  // Una sola descripción de la imagen para las dos redes: Open Graph y
  // Twitter piden los mismos datos y divergir en el `alt` de una de las dos
  // es el clásico despiste que nadie ve hasta que comparte el enlace.
  const image = {
    url: OG_IMAGE_PATH,
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    alt: fullTitle,
    type: "image/png",
  } as const;

  return {
    title: fullTitle,
    description,
    /*
     * `<meta name="author">`, nombre de metadatos estándar de HTML
     * (2026-09-29, decisión del dueño tras ver en el Post Inspector de LinkedIn
     * el campo Author vacío). El nombre sale de `SITE.author`, la misma fuente
     * que reutilizan el aviso legal (`LEGAL_ENTITY.name`) y el nodo `Person`
     * del JSON-LD, para que no puedan divergir. NO se importa `legal.ts` desde
     * aquí: este módulo también llega al JS de cliente y lo metería entero en
     * la portada (ver el comentario de `SITE.author`). Solo el nombre, sin
     * `url`: Next emitiría además un `<link rel="author">`, que no se pidió.
     *
     * NO se declara fecha de publicación ni `article:*`: las páginas son
     * `og:type` `website`, y en Open Graph ese tipo no tiene más propiedades
     * que las básicas; una landing viva no tiene una fecha de publicación única
     * y verdadera. Que LinkedIn lea esta etiqueta para su campo Author no está
     * documentado: se comprueba en el Post Inspector tras desplegar.
     */
    authors: [{ name: SITE.author }],
    ...(keywords ? { keywords: [...keywords] } : {}),
    /*
     * `languages` emite un `<link rel="alternate" hreflang="…">` por entrada,
     * con la clave TAL CUAL como `hreflang` — verificado leyendo el paquete
     * instalado (`next/dist/lib/metadata/metadata.js`, bloque "--- Alternates
     * ---": `hrefLang: locale` sobre `Object.entries(languages)`), que es lo
     * que hace válida la clave `x-default`, no un código de idioma.
     *
     * Las TRES entradas viajan en las SEIS páginas, la propia incluida: una
     * página que se omitiera a sí misma del conjunto rompería la reciprocidad
     * que Google exige para hacer caso al grupo entero.
     */
    alternates: {
      canonical: url,
      languages: alternateUrls(routeKey),
    },
    // Objeto COMPLETO a propósito (ver docblock): siteName, locale y type
    // tienen que repetirse en cada ruta porque H2 impide heredarlos del
    // layout.
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE.name,
      locale: OG_LOCALES[locale],
      /* `og:locale:alternate` declara en qué OTROS idiomas existe la misma
         página. Se deriva de `LOCALES` en vez de escribirse a mano para que
         un tercer idioma futuro no dependa de que alguien se acuerde. */
      alternateLocale: LOCALES.filter((other) => other !== locale).map(
        (other) => OG_LOCALES[other],
      ),
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
    },
    // Las tres claves de `googleBot` son las que habilitan rich results y
    // fragmentos largos en la SERP — la palanca AEO/AIO concreta que pide el
    // encargo, no un valor decorativo.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        "index": true,
        "follow": true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}
