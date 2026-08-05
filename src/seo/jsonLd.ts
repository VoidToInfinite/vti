import { SITE, absoluteUrl } from "@/config/site";
import { links } from "@/config/links";

/**
 * Constructores de datos estructurados JSON-LD (schema.org).
 *
 * Es la palanca concreta de AEO/GEO/AIO del encargo: lo que un motor de
 * búsqueda generativo (Google AI Overviews, ChatGPT, Perplexity…) cita de un
 * sitio es entidad + autoría + fecha, y eso vive en JSON-LD, no en
 * `<meta keywords>` — Google ignora esa etiqueta desde 2009 y ningún motor
 * generativo la usa como señal de autoridad.
 *
 * Regla dura de veracidad (protocolo del repo): todo campo que dependa de un
 * dato identificativo aún desconocido (dirección postal, NIF, teléfono,
 * fecha de fundación, número de empleados…) se OMITE del objeto — nunca se
 * rellena con `POR_COMPLETAR` ni con un valor plausible. Un dato falso en
 * datos estructurados es peor que su ausencia: un cliente lo consume como
 * hecho verificado, no como texto visible que un humano pueda contrastar.
 * Por eso `Organization` de aquí no lleva `address` ni `taxID`, aunque
 * `src/config/legal.ts` (flujo S2) sí necesite marcarlos `POR_COMPLETAR` de
 * forma visible en las páginas legales: son dos documentos con reglas
 * distintas — uno lo lee un humano, el otro lo consume una máquina como
 * hecho.
 */

/** `@id` estables para que los nodos se referencien entre sí sin duplicar el objeto entero. */
const ORGANIZATION_ID = `${SITE.url}#organization`;
const WEBSITE_ID = `${SITE.url}#website`;

export interface OrganizationJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "Organization";
  readonly "@id": string;
  readonly "name": string;
  readonly "url": string;
  readonly "logo": string;
  readonly "sameAs": readonly string[];
}

export interface WebSiteJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "WebSite";
  readonly "@id": string;
  readonly "name": string;
  readonly "url": string;
  readonly "inLanguage": string;
  readonly "publisher": { readonly "@id": string };
}

export interface BreadcrumbListItem {
  readonly "@type": "ListItem";
  readonly "position": number;
  readonly "name": string;
  readonly "item": string;
}

export interface BreadcrumbListJsonLd {
  readonly "@type": "BreadcrumbList";
  readonly "itemListElement": readonly BreadcrumbListItem[];
}

export interface WebPageJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "WebPage";
  readonly "@id": string;
  readonly "url": string;
  readonly "name": string;
  readonly "description": string;
  readonly "inLanguage": string;
  readonly "isPartOf": { readonly "@id": string };
  readonly "breadcrumb"?: BreadcrumbListJsonLd;
  readonly "datePublished"?: string;
  readonly "dateModified"?: string;
}

/**
 * Entidad de la organización. `sameAs` recoge únicamente destinos externos
 * REALES ya confirmados (GitHub, Discord, tomados de `src/config/links.ts`,
 * que este fichero consume y no duplica): perfiles de la entidad en OTRAS
 * plataformas. `dev.voidtoinfinite.com` (`playground`/`sdk` en
 * `links.ts`) queda fuera a propósito — es un subdominio propio, no un
 * perfil externo, y `sameAs` existe para que un buscador enlace la misma
 * entidad en distintas plataformas, no para enlazar el sitio consigo mismo.
 */
export function organizationJsonLd(): OrganizationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    "name": SITE.name,
    "url": SITE.url,
    "logo": absoluteUrl("/brand/logo.svg"),
    "sameAs": [links.github, links.discord],
  };
}

/** El sitio como entidad, referenciando a la organización que lo publica por `@id`. */
export function webSiteJsonLd(): WebSiteJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    "name": SITE.name,
    "url": SITE.url,
    "inLanguage": SITE.lang,
    "publisher": { "@id": ORGANIZATION_ID },
  };
}

export interface WebPageJsonLdInput {
  /** Ruta interna canónica, con barra inicial: "/" o "/privacidad". */
  readonly path: string;
  readonly name: string;
  readonly description: string;
  readonly datePublished?: string;
  readonly dateModified?: string;
}

/**
 * Página concreta, con su propio `breadcrumb` de dos niveles (Inicio → la
 * página). El ancla estable de cada sección del documento legal (D22) es lo
 * que hace "citable" un documento largo para un motor generativo; este
 * `WebPage` es el nodo que ata esa página a la organización y al sitio.
 *
 * La raíz (`path === "/"`) es la única excepción: no lleva `breadcrumb`. La
 * documentación oficial de Google sobre datos estructurados de breadcrumb
 * (https://developers.google.com/search/docs/appearance/structured-data/breadcrumb,
 * sección "Guidelines", consultada el 2026-08-05) dice textualmente: "It is
 * not required to include a breadcrumb ListItem for the top level path (your
 * site's domain or host name), nor for the page itself." Para la raíz, "el
 * top level path" y "la página" son el MISMO nodo — ambos extremos que la
 * propia guía exime son idénticos aquí — y la misma página especifica
 * además que un `BreadcrumbList` debe tener "at least two ListItems". No hay
 * forma de construir dos niveles reales sin duplicar el mismo nodo dos veces
 * (justo el "Inicio → VoidToInfinite" que no describe ninguna jerarquía).
 * Se omite la clave entera en vez de emitir un array vacío o de un elemento,
 * que tampoco sería válido contra el propio mínimo que exige la guía.
 */
export function webPageJsonLd(input: WebPageJsonLdInput): WebPageJsonLd {
  const url = absoluteUrl(input.path);
  const home = absoluteUrl("/");
  const isRoot = input.path === "/";

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    "name": input.name,
    "description": input.description,
    "inLanguage": SITE.lang,
    "isPartOf": { "@id": WEBSITE_ID },
    ...(isRoot
      ? {}
      : {
          breadcrumb: {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Inicio",
                "item": home,
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": input.name,
                "item": url,
              },
            ],
          } satisfies BreadcrumbListJsonLd,
        }),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
  };
}
