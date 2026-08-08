"use client";

import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";

/*
 * Cuerpo de cliente de la 404 (auditoria SEO 2026-08-08, mismo patron que
 * las paginas legales -- ver `PrivacyDocument.tsx`): `app/not-found.tsx`
 * exporta `metadata`, y una ruta que exporta `metadata` NO puede ser
 * Client Component (el plugin de TypeScript de Next lo marca como error
 * explicito, ver el docblock de `app/privacidad/page.tsx`). El texto
 * traducido SI necesita cliente (`useTranslation`), asi que vive aqui, en un
 * componente aparte que la cascara de servidor solo monta.
 */
export function NotFoundContent(): ReactElement {
  const { t } = useTranslation("common");
  return (
    <main>
      <h1>{t("notFound.title")}</h1>
      <p>{t("notFound.message")}</p>
    </main>
  );
}
