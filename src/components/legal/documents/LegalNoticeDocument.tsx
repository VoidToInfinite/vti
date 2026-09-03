"use client";

import type { ReactElement } from "react";
import { Footer } from "@/components/layout/Footer/Footer";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { LegalDocument } from "@/components/legal/LegalDocument";

/**
 * Envoltorio finísimo de `/aviso-legal` -- mismo patrón que `PrivacyDocument`,
 * ver su docblock para el porqué de la composición, incluida la reversión de
 * D20 del 2026-09-03 (las legales montan el `Navbar` del sitio, no una
 * cabecera propia) y qué pasa con «Más» y con la hoja móvil.
 */
export function LegalNoticeDocument(): ReactElement {
  return (
    <>
      <Navbar />
      <LegalDocument docKey="legalNotice" />
      <Footer />
    </>
  );
}
