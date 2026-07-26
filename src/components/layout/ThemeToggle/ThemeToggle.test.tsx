import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { ThemeToggle } from "./ThemeToggle";

// ThemeProvider lee "vti-theme" de localStorage al montar (ver
// ThemeProvider.tsx) — mismo patrón ya usado por Eye.test.tsx/Story.qa.test.tsx
// para fijar el tema de arranque en los tests.
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("ThemeToggle", () => {
  it("con themeName='light' muestra el icono de sol (tema activo) y ofrece pasar a oscuro", () => {
    // ThemeProvider arranca en claro por defecto, sin nada en localStorage.
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeInTheDocument();
    // El icono de sol es un <circle> + rayos; el de luna es un único <path>.
    expect(container.querySelector("circle")).toBeInTheDocument();
    expect(container.querySelector("path")).not.toBeInTheDocument();
  });

  it("con themeName='dark' muestra el icono de luna (tema activo) y ofrece pasar a claro", () => {
    window.localStorage.setItem("vti-theme", "dark");
    const { container } = renderWithProviders(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });

  it("el title coincide con el aria-label (mismo texto, misma clave i18n)", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button", { name: "Cambiar a tema oscuro" });
    expect(boton).toHaveAttribute("title", "Cambiar a tema oscuro");
  });

  it("click dispara toggleTheme: el tema activo cambia y el icono/etiqueta se invierten", () => {
    const { container } = renderWithProviders(<ThemeToggle />);

    // Arranca en claro: sol + "Cambiar a tema oscuro".
    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeInTheDocument();

    act(() => {
      screen.getByRole("button").click();
    });

    // Tras el click pasa a oscuro: luna + "Cambiar a tema claro".
    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro" }),
    ).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
    expect(container.querySelector("circle")).not.toBeInTheDocument();
  });

  it("tiene el area tactil minima de 44px heredada de IconButton", () => {
    renderWithProviders(<ThemeToggle />);
    const boton = screen.getByRole("button");
    const estilo = getComputedStyle(boton);
    expect(estilo.width).toBe("44px");
    expect(estilo.height).toBe("44px");
  });
});
