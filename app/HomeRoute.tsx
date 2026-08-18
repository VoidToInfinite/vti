import type { ReactElement } from "react";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Hero } from "@/components/sections/Hero/Hero";
import { HomeSections } from "@/components/sections/HomeSections";
import { Footer } from "@/components/layout/Footer/Footer";
import { SITE, type Locale } from "@/config/site";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";

/**
 * El ÁRBOL de la portada, uno solo para los dos idiomas (2026-08-18).
 *
 * `/` y `/en` son la misma página en dos idiomas, no dos páginas: montan los
 * mismos componentes, en el mismo orden, y el idioma lo aporta el proveedor
 * que las envuelve (`app/(es)/layout.tsx` / `app/en/layout.tsx`). Extraer el
 * árbol aquí es lo que impide que las dos cáscaras se conviertan en dos copias
 * que divergen a la primera sección que alguien añada en una y olvide en la
 * otra — el mismo criterio que ya aplica `LegalDocument` a los documentos
 * legales.
 *
 * Lo que NO viaja aquí es la `metadata` de cada ruta: es un export de módulo
 * que Next lee del `page.tsx`, así que cada cáscara declara la suya (y con
 * ella su canónica, su `og:locale` y su `hreflang`).
 *
 * `name` del nodo `WebPage` es el título de la página, NO `SITE.name`. Las dos
 * páginas legales ya siguen ese criterio -- cada una pasa el título de su
 * documento -- y el modelo de schema.org lo pide así: la marca es el `name`
 * del nodo `WebSite` (que el root layout emite una sola vez), mientras que el
 * `name` de un `WebPage` es el título de ESA página. Declarar aquí la marca
 * dejaría el nodo diciendo una cosa y el `<title>` otra, que es exactamente la
 * clase de divergencia silenciosa que los datos estructurados existen para
 * evitar.
 */
export interface HomeRouteProps {
  readonly locale: Locale;
  /** Título de la portada en ESTE idioma, sin sufijo de marca. */
  readonly title: string;
  readonly description: string;
}

export function HomeRoute({
  locale,
  title,
  description,
}: HomeRouteProps): ReactElement {
  return (
    <>
      {/*
       * El título de la pestaña sigue al idioma del proveedor (crítica externa
       * #8). Desde que el idioma va anclado a la URL, este componente ya no
       * corrige un cambio en memoria: reafirma, en cliente, el MISMO título
       * que la `metadata` de la ruta ya horneó — y sigue haciendo falta porque
       * React pisa el nodo `<title>` al commitear esa metadata (traza medida
       * en el docblock de `src/seo/useDocumentMeta.ts`). Las dos claves
       * resuelven al mismo texto que `SITE.homeTitle`/`SITE.description` en
       * castellano (candado en `src/seo/DocumentMeta.test.tsx`).
       */}
      <DocumentMeta
        titleKey="Common.Meta.home.title"
        descriptionKey="Common.Meta.home.description"
      />
      <JsonLdScript
        id="jsonld-home"
        data={webPageJsonLd({
          routeKey: "home",
          locale,
          name: title,
          description,
        })}
      />
      <Navbar />
      {/* id="main" + tabIndex={-1}: destino del SkipLink (Task 2). El -1 lo
          hace focalizable de forma programatica sin sumarlo al orden normal
          de tabulacion -- patron estandar para el objetivo de un skip link,
          necesario porque un navegador puede desplazar el scroll hasta un
          elemento sin foco real sin el, dejando el foco en <body>. */}
      <main
        id="main"
        tabIndex={-1}
      >
        <Hero />
        <HomeSections />
      </main>
      <Footer />
    </>
  );
}

/** Copia de la portada CASTELLANA, la que ya alimentaba el `<title>` horneado. */
export const HOME_COPY_ES = {
  title: SITE.homeTitle,
  description: SITE.description,
} as const;
