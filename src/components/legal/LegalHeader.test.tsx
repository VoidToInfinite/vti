import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { I18nProvider } from "@/i18n/I18nProvider";
import { routePath } from "@/config/site";
import { type } from "@/theme/tokens/type";
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

  /*
   * CRÍTICA EXTERNA #15, hallazgo C6 (2026-09-02). El rótulo de marca de esta
   * cabecera escribía `font-size: 1.15rem` a mano, byte a byte el mismo valor
   * que el `ScBrandLink` de `Navbar.tsx` -- dos cabeceras sin saber la una de
   * la otra. Ahora lee `type.scale.wordmark`, el peldaño que nombra esa
   * medida.
   *
   * Este candado ata la mitad que jsdom puede ver: el tamaño que llega al CSS
   * es el del peldaño, así que retocar el token y esta pieza no pueden
   * divergir. La mitad de la PROCEDENCIA (que la fuente lea el token en vez de
   * repetir un literal equivalente) no la ve ningún test -- el CSS renderizado
   * no distingue los dos casos (`task/lessons.md`, 2026-08-12) -- y la cierra
   * la familia `font-size` de `scripts/detect-anti-patterns.mjs`.
   *
   * Se inspecciona `document.styleSheets` y no `getComputedStyle` por el
   * motivo de siempre en este repo (regla 36/44): jsdom no resuelve la
   * cascada de styled-components de forma fiable, pero el texto de la regla
   * inyectada es exactamente lo que llega al navegador.
   */
  it("crítica #15: el rótulo de marca lee type.scale.wordmark, no un 1.15rem propio", () => {
    const { container } = renderWithProviders(<LegalHeader />);
    // Primer ancla del DOM = la marca (mismo criterio que el test de /en/*).
    const marca = container.querySelector("a");
    expect(marca).not.toBeNull();

    const clases = Array.from(marca!.classList);
    let css = "";
    for (const hoja of Array.from(document.styleSheets)) {
      let reglas: CSSRuleList;
      try {
        reglas = hoja.cssRules;
      } catch {
        continue;
      }
      for (const regla of Array.from(reglas)) {
        if (clases.some((c) => regla.cssText.includes(`.${c}`)))
          css += regla.cssText;
      }
    }

    // Guarda contra el verde vacío: si no se hubiera encontrado ninguna regla
    // del elemento, el `toContain` de abajo fallaría por el motivo equivocado.
    expect(css).toContain("font-size");
    expect(css).toContain(`font-size: ${type.scale.wordmark.size}`);
  });
});
