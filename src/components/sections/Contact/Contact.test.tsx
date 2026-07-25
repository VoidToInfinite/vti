import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Contact } from "./Contact";

describe("Contact", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    // Lección de Story/Features: un `aria-labelledby` que apunte a un id
    // equivocado deja la sección anónima para un lector de pantalla, y aun
    // así un `getByRole("region")` a secas seguiría encontrándola. Se busca
    // la región POR EL NOMBRE exacto del título real (i18n, no inventado)
    // para que un id mal enlazado haga fallar el test de verdad.
    renderWithProviders(<Contact />);
    const region = screen.getByRole("region", { name: "Hablemos" });
    expect(region).toHaveAccessibleName("Hablemos");
    expect(region).toHaveAttribute("id", "contact");
  });

  it("ofrece un camino de contacto por email", () => {
    renderWithProviders(<Contact />);
    const email = screen.getByRole("link", {
      name: /email|correo|escribir/i,
    });
    expect(email.getAttribute("href")).toMatch(/^mailto:/);
  });

  it("tiene un h2 y no introduce una segunda h1", () => {
    const { container } = renderWithProviders(<Contact />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });
});
