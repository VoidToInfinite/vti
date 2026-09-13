import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LegalNoticeDocument } from "@/components/legal/documents/LegalNoticeDocument";
import { LEGAL_VERSIONS } from "@/config/legal";
import enLegal from "@/i18n/locales/en/legal.json";
import { JsonLdScript } from "@/seo/JsonLdScript";
import { webPageJsonLd } from "@/seo/jsonLd";
import { buildMetadata } from "@/seo/metadata";

/* `/en/legal-notice`: contraparte inglesa de `/aviso-legal`. Mismo patrón que
   `app/en/privacy/page.tsx` -- ver su docblock para el porqué del slug
   traducido y de por qué no se duplica ni un componente. */
const doc = enLegal.Legal.legalNotice;

export const metadata: Metadata = buildMetadata({
  routeKey: "legalNotice",
  locale: "en",
  title: doc.title,
  description: doc.description,
});

export default function EnLegalNoticePage(): ReactElement {
  return (
    <>
      <JsonLdScript
        id="jsonld-legal-notice-en"
        data={webPageJsonLd({
          routeKey: "legalNotice",
          locale: "en",
          name: doc.title,
          description: doc.description,
          dateModified: LEGAL_VERSIONS.legalNotice.updated,
        })}
      />
      <LegalNoticeDocument />
    </>
  );
}
