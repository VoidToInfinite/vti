import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { LegalHeader } from "./LegalHeader";

/*
 * Ata D20 de la spec 2026-08-04-legal-seo-consentimiento-design.md:
 * `LegalHeader` es una cabecera propia, no el `Navbar` de la home. El
 * candado central de este archivo es la AUSENCIA de las 4 anclas de sección
 * del Navbar (`#story`/`#journey`/`#features`/`#contact`), que en las
 * páginas legales no tienen destino.
 */
describe("LegalHeader", () => {
  it("tiene un enlace a la home ('/')", () => {
    const { container } = renderWithProviders(<LegalHeader />);
    expect(container.querySelector('a[href="/"]')).not.toBeNull();
  });

  it("monta el conmutador de tema", () => {
    renderWithProviders(<LegalHeader />);
    // ThemeToggle es un IconButton sin texto visible: se identifica por su
    // aria-label, que describe la ACCIÓN (Common.ThemeToggle.switchToDark
    // en el estado por defecto -- ThemeProvider arranca en "light").
    expect(
      screen.getByRole("button", { name: /oscuro|dark/i }),
    ).toBeInTheDocument();
  });

  it("monta el selector de idioma con los dos botones (Español/English)", () => {
    renderWithProviders(<LegalHeader />);
    expect(screen.getByRole("button", { name: "Español" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
  });

  it("NO monta ninguna ancla de sección del Navbar de la home (D20)", () => {
    // Sonda positiva primero: el enlace a "/" SÍ existe (test de arriba), así
    // que si esta aserción de ausencia pasara con el componente roto por
    // completo (sin renderizar nada), no pasaría por vacuidad -- ya hay
    // cobertura de que el componente renderiza contenido real.
    const { container } = renderWithProviders(<LegalHeader />);
    for (const anchor of ["#story", "#journey", "#features", "#contact"]) {
      expect(
        container.querySelector(`a[href="${anchor}"]`),
        `no debería existir un enlace a ${anchor}`,
      ).toBeNull();
    }
  });

  it("renderiza un <header> semántico", () => {
    const { container } = renderWithProviders(<LegalHeader />);
    expect(container.querySelector("header")).not.toBeNull();
  });
});
