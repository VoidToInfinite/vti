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

  /*
   * P0 de la auditoria premium 2026-08-08: la 404 no tenia NINGUN enlace de
   * salida. Estas tres aserciones verifican, en este orden, las tres partes
   * del criterio del brief: el enlace existe, apunta a "/", y es un <a> REAL
   * (no un boton ni un <span> con onClick) -- lo tercero importa porque solo
   * un <a> real es alcanzable por teclado y anunciado como enlace por un
   * lector de pantalla sin JS adicional.
   */
  it("renderiza un enlace de vuelta al inicio", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toBeInTheDocument();
  });

  it("el enlace de vuelta apunta a la home ('/')", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace).toHaveAttribute("href", "/");
  });

  it("el enlace de vuelta es un <a> real, no un elemento simulado", () => {
    renderWithProviders(<NotFoundContent />);
    const enlace = screen.getByRole("link", { name: /volver al inicio/i });
    expect(enlace.tagName).toBe("A");
  });
});
