import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { About } from "./About";

describe("About", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    // Lección de Features/Contact: un `aria-labelledby` que apunte a un id
    // equivocado deja la sección anónima para un lector de pantalla, y aun
    // así un `getByRole("region")` a secas seguiría encontrándola. Se busca
    // la región POR EL NOMBRE exacto del título real (i18n, no inventado)
    // para que un id mal enlazado haga fallar el test de verdad.
    renderWithProviders(<About />);
    const region = screen.getByRole("region", { name: "Acerca de" });
    expect(region).toHaveAccessibleName("Acerca de");
    expect(region).toHaveAttribute("id", "about");
  });

  it("tiene un h2 y no introduce una segunda h1", () => {
    const { container } = renderWithProviders(<About />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });
});
