import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Features } from "./Features";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
});

describe("Features", () => {
  it("es una region con su nombre accesible real (no un aria-labelledby colgando)", () => {
    // Lección de Story: un `aria-labelledby` que apunte a un id equivocado
    // deja la sección anónima para un lector de pantalla, y aun así un
    // `getByRole("region")` a secas seguiría encontrándola. Se busca la
    // región POR EL NOMBRE exacto del título real (i18n, no inventado) para
    // que un id mal enlazado haga fallar el test de verdad.
    renderWithProviders(<Features />);
    const region = screen.getByRole("region", { name: "Nuestro presente" });
    expect(region).toHaveAccessibleName("Nuestro presente");
    expect(region).toHaveAttribute("id", "features");
  });

  it("muestra las tres areas reales del equipo", () => {
    renderWithProviders(<Features />);
    expect(screen.getByText(/Estudio|Learning/i)).toBeInTheDocument();
    expect(screen.getByText(/Imaginacion|Imagination/i)).toBeInTheDocument();
    expect(screen.getByText(/Gaming/i)).toBeInTheDocument();
  });

  it("cada area es un articulo con su encabezado", () => {
    const { container } = renderWithProviders(<Features />);
    expect(container.querySelectorAll("article")).toHaveLength(3);
    expect(container.querySelectorAll("h3")).toHaveLength(3);
  });

  it("no introduce un segundo h1 (jerarquia correcta bajo la h1 del hero)", () => {
    const { container } = renderWithProviders(<Features />);
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(container.querySelector("h2")).toBeInTheDocument();
  });

  it("culmina en el CTA al playground (north-star)", () => {
    renderWithProviders(<Features />);
    const cta = screen.getByRole("link", {
      name: /playground|componentes|components/i,
    });
    expect(cta).toHaveAttribute("href");
  });

  it("expone el estado de reveal como atributo (css: false no permite aserta estilos computados)", () => {
    const { container } = renderWithProviders(<Features />);
    const items = container.querySelectorAll("[data-revealed]");
    expect(items.length).toBeGreaterThan(0);
  });
});
