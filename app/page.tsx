import type { ReactElement } from "react";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Hero } from "@/components/sections/Hero/Hero";
import { HomeSections } from "@/components/sections/HomeSections";
import { Footer } from "@/components/layout/Footer/Footer";
import { ROUTES, SITE } from "@/config/site";
import { DocumentMeta } from "@/seo/DocumentMeta";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";

/*
 * `name` es `SITE.homeTitle`, el MISMO valor del que sale el `<title>` de
 * esta ruta (`app/layout.tsx`), no `SITE.name`. Las DOS páginas legales
 * (`LEGAL_ROUTE_KEYS`, `src/config/site.ts`; eran cuatro hasta el
 * 2026-08-08) ya siguen ese criterio -- cada una pasa el título de su
 * documento, no la marca -- y el modelo de schema.org lo pide así: la marca
 * es el `name` del nodo `WebSite` (que el layout ya emite), mientras que el
 * `name` de un `WebPage` es el título de ESA página. Declarar aquí la marca
 * dejaría el nodo diciendo una cosa y el `<title>` otra, que es exactamente
 * la clase de divergencia silenciosa que los datos estructurados existen
 * para evitar.
 */
export default function HomePage(): ReactElement {
  return (
    <>
      {/*
       * El título de la pestaña sigue al idioma (crítica externa #8): la
       * `metadata` de esta ruta se hornea en castellano en build -- correcta
       * y necesaria así para los rastreadores, ver `app/layout.tsx` --, pero
       * hasta esta entrega NADA la actualizaba cuando el visitante pasaba a
       * inglés. El defecto era visible por comparación: `/privacidad` SÍ
       * cambiaba de título con el idioma desde la ola D, y la home no. Las
       * dos claves resuelven al MISMO texto que `SITE.homeTitle` y
       * `SITE.description` en castellano (candado en
       * `src/seo/DocumentMeta.test.tsx`); el inglés es la traducción de ese
       * mismo copy, no un mensaje nuevo. Ver `src/seo/useDocumentMeta.ts`.
       */}
      <DocumentMeta
        titleKey="Common.Meta.home.title"
        descriptionKey="Common.Meta.home.description"
      />
      <JsonLdScript
        id="jsonld-home"
        data={webPageJsonLd({
          path: ROUTES.home,
          name: SITE.homeTitle,
          description: SITE.description,
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
