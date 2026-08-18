import type { Metadata } from "next";
import type { ReactElement } from "react";
import { buildMetadata } from "@/seo/metadata";
import { HOME_COPY_ES, HomeRoute } from "../HomeRoute";

/*
 * Portada castellana, `/`. Su metadata vivía en `app/layout.tsx` hasta el
 * 2026-08-18 y baja aquí porque el root layout ya lo comparten dos idiomas:
 * una canónica declarada allí se heredaría en `/en` (ver el docblock de
 * `app/layout.tsx`).
 *
 * `title` sale de `SITE.homeTitle`, NO de `SITE.name` (cambio del
 * 2026-08-05). Pasar la marca como título activaba el caso especial de
 * `buildMetadata()` -- título === marca, no se añade sufijo, para no producir
 * "VoidToInfinite · VoidToInfinite" -- y el efecto colateral era que el
 * `<title>` de la home quedaba en la marca desnuda, sin una sola palabra sobre
 * qué es el sitio. Ese mismo valor alimenta el `<title>`, el `og:title` y el
 * `twitter:title` (ver `buildMetadata`), así que la carencia se repetía en la
 * pestaña, en el resultado de búsqueda y en cada vista previa compartida. El
 * caso especial de `buildMetadata` sigue existiendo y sigue cubierto por su
 * propio test, solo que esta ruta ya no lo ejerce.
 */
export const metadata: Metadata = buildMetadata({
  routeKey: "home",
  locale: "es",
  title: HOME_COPY_ES.title,
  description: HOME_COPY_ES.description,
});

export default function HomePage(): ReactElement {
  return (
    <HomeRoute
      locale="es"
      title={HOME_COPY_ES.title}
      description={HOME_COPY_ES.description}
    />
  );
}
