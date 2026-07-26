import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { act } from "@testing-library/react";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { Navbar } from "./Navbar";

// Dispara el estado `scrolled` del hook `useScrolled(8)` igual que el resto
// de la suite (ver los `it` de arriba): mismo patron, extraido para no
// repetirlo en las cuatro combinaciones tema x scroll de mas abajo.
function scrollPast(): void {
  act(() => {
    Object.defineProperty(window, "scrollY", {
      value: 20,
      writable: true,
      configurable: true,
    });
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("Navbar", () => {
  beforeEach(() => {
    // Restaurar scrollY al inicio de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    // ThemeProvider lee "vti-theme" de localStorage al montar: sin limpiarlo,
    // el test que lo fija a un tema contaminaria a los siguientes dentro del
    // mismo fichero (mismo razonamiento que Eye.test.tsx, necesario ahora que
    // hay tests que alternan light/dark en la misma suite).
    window.localStorage.clear();
  });

  afterEach(() => {
    // Restaurar scrollY después de cada test
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    window.localStorage.clear();
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

  describe("el Logo (currentColor) hereda el tema de la pagina en las cuatro combinaciones tema x scroll", () => {
    // Regresion real (documentada en task/lessons.md), corregida ahora en
    // espejo: `Navbar` forzaba `basicDarkTheme` mientras la barra era
    // transparente, razonando que el hero era negro en los dos temas. Con la
    // pagina en claro y la barra sin scroll ese forzado pintaba el Logo
    // (`fill: currentColor`, sin `color` propio) en BLANCO, casi invisible
    // sobre el hero, que en esa combinacion ya no es negro (hero "Aura",
    // pastel). El arreglo quita el ThemeProvider anidado: `ScBrandLink` (que
    // si fija `color: theme.semantic.text`) resuelve siempre contra el
    // ThemeProvider AMBIENTAL, asi que el Logo hereda el token de texto del
    // TEMA DE LA PAGINA, sea cual sea, y el estado de scroll deja de influir
    // en el color. La leccion es explicita: "verificar TODAS las
    // combinaciones de estado que los separan (aqui: 2 temas x 2 estados de
    // scroll), no solo el estado por defecto" -- de ahi los cuatro `it`.
    //
    // getComputedStyle, no un matcher de jest-styled-components (no esta en
    // el repo): jsdom + styled-components v6 ya resuelven las reglas
    // inyectadas via CSSOM real, mismo patron usado en el resto de la suite.
    // Contra el token importado (basicLightTheme/basicDarkTheme.semantic.text),
    // no un literal escrito a mano que pueda desincronizarse si la rampa de
    // color cambia.
    function logoColor(container: HTMLElement): string {
      const logo = container.querySelector('a svg[viewBox="0 7.5 500 550"]');
      expect(logo).not.toBeNull();
      return getComputedStyle(logo as Element).color;
    }

    it("tema claro + sin scroll: hereda el texto claro, no el blanco forzado", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Navbar />);

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "false",
      );
      expect(logoColor(container)).toBe(basicLightTheme.semantic.text);
    });

    it("tema claro + con scroll: sigue heredando el texto claro", () => {
      window.localStorage.setItem("vti-theme", "light");
      const { container } = renderWithProviders(<Navbar />);

      scrollPast();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "true",
      );
      expect(logoColor(container)).toBe(basicLightTheme.semantic.text);
    });

    it("tema oscuro + sin scroll: hereda el texto oscuro", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Navbar />);

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "false",
      );
      expect(logoColor(container)).toBe(basicDarkTheme.semantic.text);
    });

    it("tema oscuro + con scroll: sigue heredando el texto oscuro", () => {
      window.localStorage.setItem("vti-theme", "dark");
      const { container } = renderWithProviders(<Navbar />);

      scrollPast();

      expect(screen.getByRole("banner")).toHaveAttribute(
        "data-scrolled",
        "true",
      );
      expect(logoColor(container)).toBe(basicDarkTheme.semantic.text);
    });
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
