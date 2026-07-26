import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { act } from "@testing-library/react";
import { basicDarkTheme } from "@/theme/themes";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    // Restaurar scrollY al inicio de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restaurar scrollY después de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  it("expone el landmark de navegación", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("arranca sin estado scrolled", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-scrolled",
      "false",
    );
  });

  it("pasa a data-scrolled='true' cuando scrollY supera el offset de 8px", () => {
    renderWithProviders(<Navbar />);
    const header = screen.getByRole("banner");

    // Verificar estado inicial
    expect(header).toHaveAttribute("data-scrolled", "false");

    // Disparar scroll con scrollY > 8
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 20,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Verificar cambio de estado
    expect(header).toHaveAttribute("data-scrolled", "true");
  });

  it("vuelve a data-scrolled='false' cuando scrollY retorna a 0", () => {
    renderWithProviders(<Navbar />);
    const header = screen.getByRole("banner");

    // Subir scroll
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 20,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });
    expect(header).toHaveAttribute("data-scrolled", "true");

    // Volver a 0
    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    // Verificar vuelta al estado inicial
    expect(header).toHaveAttribute("data-scrolled", "false");
  });

  it("renderiza el enlace de marca", () => {
    renderWithProviders(<Navbar />);
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    expect(brandLink).toBeInTheDocument();
    expect(brandLink).toHaveAttribute("href", "/");
  });

  it("el enlace de marca incluye el atomo Logo compartido (A1)", () => {
    // Regresion: sin esta aserción, quitar <Logo size="1.5rem" /> de
    // ScBrandLink en Navbar.tsx no lo detecta ningun test (el de arriba solo
    // mira nombre accesible y href). Mismo patron ya usado en
    // Sol.test.tsx ("dibuja el atomo Logo compartido...") y en Wormhole.test.tsx.
    const { container } = renderWithProviders(<Navbar />);
    const brandLink = screen.getByRole("link", { name: /VoidToInfinite/i });
    const logo = brandLink.querySelector('svg[viewBox="0 7.5 500 550"]');

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("aria-hidden", "true");
    // El h1 del hero es el unico titular de la pagina; Navbar no debe aportar
    // ninguno.
    expect(container.querySelectorAll("h1")).toHaveLength(0);
  });

  it("el Logo (currentColor) hereda el blanco forzado, no el del tema ambiental, con la pagina en claro y sin scroll", () => {
    // Regresion real, no hipotetica: encontrada al verificar en navegador el
    // arreglo de tamano del Logo. ScBrandLink no fijaba su propio `color`, asi
    // que el Logo (que pinta con `fill: currentColor`) heredaba por CSS puro
    // desde `body`, y `body` resuelve su color contra el ThemeProvider
    // AMBIENTAL de la pagina (GlobalStyles), no contra `barTheme` (el tema
    // oscuro que Navbar fuerza mientras es transparente). Con la pagina en
    // claro y la barra sin scroll, ese ancestro daba el texto oscuro del tema
    // claro: el icono se leia casi invisible sobre el ojo negro del hero.
    // BrandName no tenia este problema porque su propio componente redeclara
    // `color: theme.semantic.text`; el Logo no.
    window.localStorage.setItem("vti-theme", "light");
    const { container } = renderWithProviders(<Navbar />);
    const logo = container.querySelector('a svg[viewBox="0 7.5 500 550"]');

    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-scrolled",
      "false",
    );
    expect(logo).not.toBeNull();
    // getComputedStyle, no un matcher de jest-styled-components (no esta en
    // el repo): jsdom + styled-components v6 ya resuelven las reglas
    // inyectadas via CSSOM real, mismo patron usado en el resto de la suite.
    // Contra el token importado (basicDarkTheme.semantic.text), no un literal
    // escrito a mano que pueda desincronizarse si la rampa de color cambia.
    expect(getComputedStyle(logo as Element).color).toBe(
      basicDarkTheme.semantic.text,
    );
  });

  it("renderiza el selector de idioma", () => {
    renderWithProviders(<Navbar />);
    // El selector de idioma se expone como botones de idioma individual
    const spanishButton = screen.getByRole("button", { name: /Español/i });
    const englishButton = screen.getByRole("button", { name: /English/i });
    expect(spanishButton).toBeInTheDocument();
    expect(englishButton).toBeInTheDocument();
  });

  it("renderiza el toggle de tema", () => {
    renderWithProviders(<Navbar />);
    // El toggle de tema se expone como un botón con aria-label
    const themeToggle = screen.getByRole("button", { name: /Cambiar a tema/i });
    expect(themeToggle).toBeInTheDocument();
  });

  it("la marca-esquina sigue al estado de scroll, no un valor fijo", () => {
    // Test de integración: sin esto, un `visible={true}` hardcodeado por error
    // en el cableado pasaría desapercibido — los tests de EyeCornerMark lo
    // cubren aislado y los de Navbar no lo miraban.
    const { container } = renderWithProviders(<Navbar />);
    const mark = (): Element | null =>
      container.querySelector("[data-visible]");

    expect(mark()).toHaveAttribute("data-visible", "false");

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 200,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(mark()).toHaveAttribute("data-visible", "true");

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 0,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(mark()).toHaveAttribute("data-visible", "false");
  });
});
