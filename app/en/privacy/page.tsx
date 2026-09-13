import type { Metadata } from "next";
import type { ReactElement } from "react";
import { PrivacyDocument } from "@/components/legal/documents/PrivacyDocument";
import { LEGAL_VERSIONS } from "@/config/legal";
import enLegal from "@/i18n/locales/en/legal.json";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";

/*
 * `/en/privacy`: la MISMA política de privacidad que `/privacidad`, servida en
 * inglés y con slug inglés.
 *
 * SLUG TRADUCIDO, no `/en/privacidad`: hasta esta entrega el documento inglés
 * solo existía tras hidratar bajo la ruta castellana, y la crítica lo midió
 * como P2 — una URL que se lee a medias en otro idioma es una señal
 * contradictoria frente al `hreflang="en"` que esta misma página declara, y un
 * enlace que el visitante inglés comparte a medio traducir.
 *
 * Ni un componente nuevo: monta el MISMO `PrivacyDocument` que la ruta
 * castellana. Lo único que cambia es el proveedor que la envuelve
 * (`app/en/layout.tsx`, `locale="en"`), y con él la instancia de i18next contra
 * la que resuelve cada `t()` del documento — así que el inglés está ya en el
 * HTML que hornea el build.
 *
 * Server Component a propósito, SIN "use client": una página que exporta
 * `metadata` NO puede ser componente de cliente (ver el docblock de
 * `app/(es)/privacidad/page.tsx`). La copia de la metadata se lee del locale
 * INGLÉS directamente, no vía `t()`: `metadata` se resuelve en tiempo de build,
 * donde no hay idioma activo que consultar.
 */
const doc = enLegal.Legal.privacy;

export const metadata: Metadata = buildMetadata({
  routeKey: "privacy",
  locale: "en",
  title: doc.title,
  description: doc.description,
});

export default function EnPrivacyPage(): ReactElement {
  return (
    <>
      <JsonLdScript
        id="jsonld-privacy-en"
        data={webPageJsonLd({
          routeKey: "privacy",
          locale: "en",
          name: doc.title,
          description: doc.description,
          dateModified: LEGAL_VERSIONS.privacy.updated,
        })}
      />
      <PrivacyDocument />
    </>
  );
}
