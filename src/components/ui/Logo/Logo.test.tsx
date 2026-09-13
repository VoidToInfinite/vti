import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("usa el viewBox de la marca (500x550, origen Y desplazado para centrar el dibujo)", () => {
    // "0 7.5 500 550", no "0 0 500 550": el dibujo mide y en [25, 540] dentro
    // de un lienzo de 550 -- 25px de margen arriba y solo 10 abajo. El
    // origen Y a 7.5 reparte ese margen por igual (17.5 a cada lado). Ver el
    // comentario de Logo.tsx para el calculo completo.
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 7.5 500 550");
  });

  it("sin title: es decorativo, aria-hidden y sin role", () => {
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("con title: expone role=img y nombre accesible", () => {
    renderWithProviders(<Logo title="VoidToInfinite" />);
    const img = screen.getByRole("img", { name: "VoidToInfinite" });
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute("aria-hidden");
  });

  /*
   * Estos dos casos aseveran sobre el ancho COMPUTADO, no sobre el atributo
   * `width` del svg. El atributo no sirve como contrato: GlobalStyles declara
   * `svg { width: 100% }` para todo el sitio, y una declaracion CSS gana
   * siempre a un atributo de presentacion. Con el tamano solo en el atributo,
   * los tests pasaban en verde mientras el logo se renderizaba al 100% de su
   * contenedor -- medido en navegador: 167px de ancho dentro de un navbar de
   * 56px de alto. La aseveracion sobre CSS es la que reproduce el fallo.
   */
  it("la prop size fija el ancho CSS del svg", () => {
    const { container } = renderWithProviders(<Logo size="1.5rem" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(getComputedStyle(svg).width).toBe("1.5rem");
  });

  it("por defecto size es 1em, y el alto siempre se deriva del viewBox", () => {
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(getComputedStyle(svg).width).toBe("1em");
    expect(getComputedStyle(svg).height).toBe("auto");
  });
});
