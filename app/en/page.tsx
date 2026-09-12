import type { Metadata } from "next";
import type { ReactElement } from "react";
import enCommon from "@/i18n/locales/en/common.json";
import { buildMetadata } from "@/seo/metadata";
import { HomeRoute } from "../HomeRoute";

/*
 * Portada inglesa, `/en`.
 *
 * El título y la descripción salen del locale INGLÉS leído directamente, no
 * vía `t()`: `metadata` se resuelve en tiempo de build, donde no hay proveedor
 * de i18next ni idioma activo que consultar — mismo criterio, y mismo motivo,
 * que las cáscaras legales castellanas (ver `app/(es)/privacidad/page.tsx`).
 * Leer aquí el MISMO JSON que verá el visitante es lo que impide que el
 * `<title>` del HTML estático y el contenido de la página divijan.
 *
 * Son las mismas dos claves que consume `HomeRoute` vía `DocumentMeta`
 * (`Common.Meta.home.*`), así que la pestaña y el resultado de búsqueda no
 * pueden decir cosas distintas.
 *
 * COPY PENDIENTE DE REVISIÓN DEL DUEÑO (decisión del 2026-08-18): se publica
 * con el `en.json` que ya era visible en la interfaz — no se expone ningún
 * texto nuevo —, y el dueño revisará después `title`/`description`.
 */
const copy = enCommon.Common.Meta.home;

export const metadata: Metadata = buildMetadata({
  routeKey: "home",
  locale: "en",
  title: copy.title,
  description: copy.description,
});

export default function EnHomePage(): ReactElement {
  return (
    <HomeRoute
      locale="en"
      title={copy.title}
      description={copy.description}
    />
  );
}
