"use client";

import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalHeader } from "@/components/legal/LegalHeader";

/**
 * Envoltorio finísimo de `/aviso-legal` -- mismo patrón que
 * `PrivacyDocument`, ver su docblock para el porqué de la composición.
 */
export function LegalNoticeDocument(): ReactElement {
  return (
    <>
      <LegalHeader />
      <LegalDocument docKey="legalNotice" />
      <Footer />
    </>
  );
}
