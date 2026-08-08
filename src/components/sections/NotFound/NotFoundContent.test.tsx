import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { NotFoundContent } from "./NotFoundContent";

/*
 * Aserciones de render trasladadas desde `app/not-found.test.tsx` (auditoria
 * SEO 2026-08-08): `app/not-found.tsx` paso a Server Component con
 * `metadata` propia y ya no puede llevar `"use client"`, asi que el `<h1>`/
 * `<p>` traducidos -- que SI necesitan cliente, consumen `useTranslation` --
 * se movieron a este componente aparte, mismo patron que
 * `PrivacyDocument.tsx`/`LegalDocument.test.tsx` para las paginas legales.
 */
describe("NotFoundContent", () => {
  it("renderiza el heading 404 traducido", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });

  it("renderiza tambien el mensaje descriptivo", () => {
    renderWithProviders(<NotFoundContent />);
    expect(screen.getByText(/no existe/i)).toBeInTheDocument();
  });
});
