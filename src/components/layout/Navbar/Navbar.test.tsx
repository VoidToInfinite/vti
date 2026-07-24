import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { act } from "@testing-library/react";
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
});
