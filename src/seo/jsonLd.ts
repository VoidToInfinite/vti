import {
  LOCALES,
  SITE,
  absoluteUrl,
  routePath,
  type Locale,
  type RouteKey,
} from "@/config/site";
import { EMAIL_ADDRESS, links } from "@/config/links";
import { LEGAL_ENTITY } from "@/config/legal";

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
const FOUNDER_ID = `${SITE.url}#founder`;

export interface OrganizationJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "Organization";
  readonly "@id": string;
  readonly "name": string;
  readonly "alternateName": string;
  readonly "url": string;
  readonly "logo": string;
  readonly "description": string;
  readonly "email": string;
  readonly "founder": { readonly "@id": string };
  readonly "sameAs": readonly string[];
}

export interface PersonJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "Person";
  readonly "@id": string;
  readonly "name": string;
  readonly "sameAs": readonly string[];
}

export interface WebSiteJsonLd {
  readonly "@context": "https://schema.org";
  readonly "@type": "WebSite";
  readonly "@id": string;
  readonly "name": string;
  readonly "alternateName": string;
  readonly "url": string;
  readonly "inLanguage": readonly Locale[];
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
    "alternateName": SITE.alternateName,
    "url": SITE.url,
    /* PNG de 512 px con fondo, generado desde `app/icon.svg` por
       `scripts/generate-icons.mjs`. Hasta el 2026-09-30 apuntaba a
       `/brand/logo.svg`, el glifo blanco sobre transparente, y la guía de
       logos de Google pide que la imagen se vea bien sobre blanco puro. */
    "logo": absoluteUrl("/brand/logo.png"),
    "description": SITE.description,
    // `links.email` lleva el esquema "mailto:" (así lo consume el `href` de
    // los enlaces de contacto, `src/config/links.ts`); schema.org modela
    // `email` como la dirección desnuda, sin esquema. El porqué no cambia;
    // sí de dónde sale la cadena: desde la Task 16 (2026-08-11) la
    // derivación vive UNA vez, en `EMAIL_ADDRESS` (`src/config/links.ts`),
    // en vez de repetir aquí el mismo `replace` que ya hacían el panel de
    // recuperación de Contacto y el enlace del pie. Sigue sin duplicar
    // ninguna cadena literal: la constante se deriva de `links.email`.
    "email": EMAIL_ADDRESS,
    /* Quién está detrás del proyecto, por `@id`. Del 2026-08-13 al
       2026-09-28 el perfil de LinkedIn del titular iba en `sameAs` de ESTE
       nodo; pero `sameAs` declara URLs de la MISMA entidad, y un perfil
       personal no es el proyecto. La relación proyecto-persona se modela
       ahora como lo que es: `founder`, apuntando al nodo `Person`, que es
       quien lleva el LinkedIn. */
    "founder": { "@id": FOUNDER_ID },
    /* `sameAs` es, por definición de schema.org, el conjunto de URLs que
       identifican inequívocamente a la MISMA entidad: los perfiles del
       proyecto en otras plataformas. */
    "sameAs": [links.github, links.discord],
  };
}

/**
 * La persona que responde del proyecto: el titular que identifica el aviso
 * legal. El nombre sale de `LEGAL_ENTITY` para que la ficha legal y los datos
 * estructurados no puedan divergir. Solo lleva lo que el sitio ya publica: el
 * nombre y el perfil de LinkedIn; ningún dato identificativo más (ver la regla
 * de veracidad de la cabecera de este fichero).
 */
export function founderJsonLd(): PersonJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": FOUNDER_ID,
    "name": LEGAL_ENTITY.name,
    "sameAs": [links.linkedin],
  };
}

/**
 * El sitio como entidad, referenciando a la organización que lo publica por
 * `@id`. Este nodo se emite UNA vez para todas las rutas (`RootDocument`),
 * castellanas e inglesas, así que declara los dos idiomas del sitio; el idioma
 * de cada página concreta lo lleva su `WebPage`.
 */
export function webSiteJsonLd(): WebSiteJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    "name": SITE.name,
    "alternateName": SITE.alternateName,
    "url": SITE.url,
    "inLanguage": LOCALES,
    "publisher": { "@id": ORGANIZATION_ID },
  };
}

export interface WebPageJsonLdInput {
  /** Identidad de la página; su ruta se deriva junto con `locale`. */
  readonly routeKey: RouteKey;
  /** Idioma de ESTA ruta: alimenta `inLanguage` y la etiqueta del breadcrumb. */
  readonly locale: Locale;
  readonly name: string;
  readonly description: string;
  readonly datePublished?: string;
  readonly dateModified?: string;
}

/**
 * Etiqueta del primer nivel del breadcrumb, por idioma.
 *
 * No sale de i18next a propósito: `webPageJsonLd()` lo llama un Server
 * Component en tiempo de build, donde no hay proveedor de i18next ni idioma
 * activo que consultar — el idioma lo decide la RUTA. Son dos palabras, viven
 * aquí y el candado de `jsonLd.test.ts` las ata a los dos idiomas.
 */
const BREADCRUMB_HOME_LABEL = {
  es: "Inicio",
  en: "Home",
} as const satisfies Record<Locale, string>;

/**
 * Página concreta, con su propio `breadcrumb` de dos niveles (Inicio → la
 * página). El ancla estable de cada sección del documento legal (D22) es lo
 * que hace "citable" un documento largo para un motor generativo; este
 * `WebPage` es el nodo que ata esa página a la organización y al sitio.
 *
 * La portada (`routeKey === "home"`, sea `/` o `/en`) es la única excepción:
 * no lleva `breadcrumb`. La
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
  const path = routePath(input.routeKey, input.locale);
  const url = absoluteUrl(path);
  /* El "Inicio" del breadcrumb es el de SU MISMO idioma: desde `/en/privacy`
     la migaja de vuelta lleva a `/en`, no a la portada castellana. */
  const home = absoluteUrl(routePath("home", input.locale));
  const isRoot = input.routeKey === "home";

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    "name": input.name,
    "description": input.description,
    "inLanguage": input.locale,
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
                "name": BREADCRUMB_HOME_LABEL[input.locale],
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
