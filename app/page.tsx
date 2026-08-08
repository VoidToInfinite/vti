import type { ReactElement } from "react";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { Hero } from "@/components/sections/Hero/Hero";
import { HomeSections } from "@/components/sections/HomeSections";
import { Footer } from "@/components/layout/Footer/Footer";
import { ROUTES, SITE } from "@/config/site";
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
      <JsonLdScript
        id="jsonld-home"
        data={webPageJsonLd({
          path: ROUTES.home,
          name: SITE.homeTitle,
          description: SITE.description,
        })}
      />
      <Navbar />
      <main>
        <Hero />
        <HomeSections />
      </main>
      <Footer />
    </>
  );
}
