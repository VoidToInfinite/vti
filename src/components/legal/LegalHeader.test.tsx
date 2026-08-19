import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { I18nProvider } from "@/i18n/I18nProvider";
import { routePath } from "@/config/site";
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

  /*
   * CRÍTICA #12, P0 (resto legal): el logotipo con `href="/"` fijo era una de
   * las dos salidas de `/en/privacy`/`/en/legal-notice` que expulsaban al
   * castellano (la otra, el «volver» de `LegalDocument`). `I18nProvider
   * locale="en"` reproduce `app/en/layout.tsx` — el proveedor interno gana al
   * de `renderWithProviders` por proximidad, el mismo mecanismo del árbol
   * real (patrón de `Navbar.test.tsx`, ola H). El complemento castellano es
   * el test de arriba: sin él, un logotipo clavado en `/en` también pasaría.
   */
  it("en /en/* el logotipo lleva a la home inglesa, no a la castellana", () => {
    const { container } = renderWithProviders(
      <I18nProvider locale="en">
        <LegalHeader />
      </I18nProvider>,
    );
    // Primer ancla del DOM = la marca (ScBrandLink va antes que el selector
    // de idioma). La aserción se acota a ELLA: el selector de idioma enlaza
    // legítimamente a la alternativa castellana y un "ningún href='/'"
    // global daría falso rojo.
    const brand = container.querySelector("a");
    expect(brand).toHaveAttribute("href", routePath("home", "en"));
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

  it("monta el selector de idioma con los dos ENLACES (Español/English) — ola G: el idioma vive en la URL", () => {
    // Contrato actualizado, no relajado (regla 40): desde la ola G el
    // selector navega a la ruta del otro idioma (entrada de historial,
    // compartible), asi que sus controles son <a> con hreflang, ya no
    // botones que conmutan i18next en memoria.
    renderWithProviders(<LegalHeader />);
    const es = screen.getByRole("link", { name: "Español" });
    const en = screen.getByRole("link", { name: "English" });
    expect(es).toHaveAttribute("hreflang", "es");
    expect(en).toHaveAttribute("hreflang", "en");
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
