"use client";

import { useTranslation } from "react-i18next";
import { useDocumentMeta } from "./useDocumentMeta";

/**
 * Punto de montaje de `useDocumentMeta()` para las rutas cuya cáscara es un
 * Server Component (`app/page.tsx`, `app/not-found.tsx`).
 *
 * Existe por una restricción de arquitectura, no por gusto: una ruta que
 * exporta `metadata` NO puede llevar `"use client"` (el plugin de TypeScript
 * de Next lo marca como error explícito — ver el docblock de
 * `app/privacidad/page.tsx`), y un hook necesita un componente de cliente que
 * lo llame. `LegalDocument.tsx` no necesita este envoltorio: ya es de cliente
 * y ya tiene su título traducido en la mano (`doc.title`, del namespace
 * `legal`), así que llama al hook directamente. Los dos caminos comparten el
 * hook, que es donde vive el comportamiento.
 *
 * Recibe CLAVES i18n, no texto: quien monta este componente es un Server
 * Component, que no puede resolver `t()` (el idioma activo vive en cliente).
 * Resolverlas aquí dentro es además lo que hace que el título vuelva a
 * calcularse en cada cambio de idioma — `useTranslation` re-renderiza este
 * componente, y el efecto del hook depende del texto ya resuelto.
 *
 * No pinta nada (`return null`): su único efecto es sobre `document`.
 */
export interface DocumentMetaProps {
  /** Clave del namespace `common` con el título de la página, sin marca. */
  readonly titleKey: string;
  /** Clave del namespace `common` con la descripción de la página. */
  readonly descriptionKey: string;
}

export function DocumentMeta({
  titleKey,
  descriptionKey,
}: DocumentMetaProps): null {
  const { t } = useTranslation("common");

  useDocumentMeta({
    title: t(titleKey),
    description: t(descriptionKey),
  });

  return null;
}
