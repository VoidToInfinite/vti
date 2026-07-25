import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Story } from "./Story";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe("Story", () => {
  it("es una region con nombre accesible", () => {
    // Buscar la region POR SU NOMBRE, no solo comprobar que existe: un
    // `aria-labelledby` apuntando a un id equivocado dejaria la seccion sin
    // nombre (un lector de pantalla anunciaria "region" a secas) y aun asi
    // pasaria un `getByRole("region")` a secas.
    renderWithProviders(<Story />);
    const region = screen.getByRole("region", {
      name: (accessibleName) => accessibleName.length > 0,
    });
    expect(region).toHaveAccessibleName();
  });

  it("tiene un h2 (jerarquia correcta bajo la h1 del hero)", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("tiene el ancla de navegacion del CTA del hero", () => {
    const { container } = renderWithProviders(<Story />);
    expect(container.querySelector("#story")).toBeInTheDocument();
  });
});
