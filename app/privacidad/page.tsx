import type { Metadata } from "next";
import type { ReactElement } from "react";
import { PrivacyDocument } from "@/components/legal/documents/PrivacyDocument";
import { LEGAL_VERSIONS } from "@/config/legal";
import { ROUTES } from "@/config/site";
import esLegal from "@/i18n/locales/es/legal.json";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";

/*
 * Server Component a propósito, SIN "use client": una página que exporta
 * `metadata` NO puede ser componente de cliente -- el plugin de TypeScript de
 * Next lo marca como error explícito
 * (`next/dist/server/typescript/rules/metadata.js`: "The Next.js 'metadata'
 * API is not allowed in a Client Component"). El documento en sí sí es de
 * cliente (consume `useTranslation`), y por eso vive en
 * `PrivacyDocument.tsx`: este fichero es solo la cáscara de servidor que
 * declara metadata y datos estructurados.
 *
 * La copia de la metadata se lee del locale ESPAÑOL directamente, no vía
 * `t()`, y eso es deliberado: `metadata` se resuelve en tiempo de build, y lo
 * que el build prerenderiza es el español (`src/i18n/config.ts`: `lng: "es"`).
 * Leer aquí el mismo JSON que verá el visitante es la única forma de que el
 * `<title>` del HTML estático y el `<h1>` del documento no puedan divergir.
 * El inglés solo existe tras hidratar, y no tiene URL propia (spec D1/§9.3).
 */
const doc = esLegal.Legal.privacy;

export const metadata: Metadata = buildMetadata({
  path: ROUTES.privacy,
  title: doc.title,
  description: doc.description,
});

export default function PrivacyPage(): ReactElement {
  return (
    <>
      <JsonLdScript
        id="jsonld-privacidad"
        data={webPageJsonLd({
          path: ROUTES.privacy,
          name: doc.title,
          description: doc.description,
          dateModified: LEGAL_VERSIONS.privacy.updated,
        })}
      />
      <PrivacyDocument />
    </>
  );
}
