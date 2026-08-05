import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LegalNoticeDocument } from "@/components/legal/documents/LegalNoticeDocument";
import { LEGAL_VERSIONS } from "@/config/legal";
import { ROUTES } from "@/config/site";
import esLegal from "@/i18n/locales/es/legal.json";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";

/* Ver el docblock de `app/privacidad/page.tsx` para el porqué del patrón
   cáscara-de-servidor + documento-de-cliente y de leer el locale español. */
const doc = esLegal.Legal.legalNotice;

export const metadata: Metadata = buildMetadata({
  path: ROUTES.legalNotice,
  title: doc.title,
  description: doc.description,
});

export default function LegalNoticePage(): ReactElement {
  return (
    <>
      <JsonLdScript
        id="jsonld-aviso-legal"
        data={webPageJsonLd({
          path: ROUTES.legalNotice,
          name: doc.title,
          description: doc.description,
          dateModified: LEGAL_VERSIONS.legalNotice.updated,
        })}
      />
      <LegalNoticeDocument />
    </>
  );
}
