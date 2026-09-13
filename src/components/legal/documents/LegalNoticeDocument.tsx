"use client";

import type { ReactElement } from "react";
import { LegalDocument } from "@/components/legal/LegalDocument";

/**
 * Envoltorio finísimo de `/aviso-legal` -- mismo patrón que `PrivacyDocument`,
 * ver su docblock para el porqué de la composición, incluida la reversión de
 * D20 del 2026-09-03 (las legales montan el `Navbar` del sitio, no una
 * cabecera propia) y qué pasa con «Más» y con la hoja móvil.
 *
 * Desde el 2026-09-04 la cabecera y el pie los monta `LocaleShell` y no este
 * envoltorio, por el mismo motivo que en `PrivacyDocument`: cuatro puntos de
 * montaje sobre los mismos módulos hacían que Turbopack emitiera la cáscara dos
 * veces en las dos portadas. La página no cambia; el porqué, con sus cifras,
 * está en el docblock de `app/providers.tsx`.
 */
export function LegalNoticeDocument(): ReactElement {
  return (
    <>
      <LegalDocument docKey="legalNotice" />
    </>
  );
}
