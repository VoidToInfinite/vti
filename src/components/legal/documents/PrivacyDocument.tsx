"use client";

import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalHeader } from "@/components/legal/LegalHeader";

/**
 * Envoltorio finísimo de `/privacidad` (D21 de la spec
 * 2026-08-04-legal-seo-consentimiento-design.md): cabecera propia (D20) +
 * el renderer único de documentos legales + el `Footer` de la home, tal
 * cual, sin modificarlo (es autónomo y ya funciona en los dos temas).
 * El hilo principal monta este componente desde `app/privacidad/page.tsx`.
 */
export function PrivacyDocument(): ReactElement {
  return (
    <>
      <LegalHeader />
      <LegalDocument docKey="privacy" />
      <Footer />
    </>
  );
}
