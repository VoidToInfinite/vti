import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { VisuallyHidden } from "./VisuallyHidden";

/*
 * El contrato de este átomo es exactamente el que un descuido rompe sin que
 * nada salte: que el texto SIGA existiendo para las tecnologías de asistencia
 * mientras no ocupa espacio visible. Por eso los dos candados centrales son
 * complementarios -- "sí está en el árbol accesible" y "no usa ninguna de las
 * tres propiedades que lo sacarían de él" -- y no uno solo.
 */
function cssRuleTextFor(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText);
      } catch {
        return [];
      }
    })
    .filter((text) => classes.some((cls) => text.includes(`.${cls}`)))
    .join("\n");
}

describe("VisuallyHidden", () => {
  it("mantiene el texto accesible por su contenido", () => {
    renderWithProviders(
      <VisuallyHidden>se abre en una pestaña nueva</VisuallyHidden>,
    );

    expect(
      screen.getByText("se abre en una pestaña nueva"),
    ).toBeInTheDocument();
  });

  it("renderiza un span por defecto y respeta el elemento pedido con `as`", () => {
    const { container } = renderWithProviders(
      <>
        <VisuallyHidden>por defecto</VisuallyHidden>
        <VisuallyHidden as="p">como parrafo</VisuallyHidden>
      </>,
    );

    expect(screen.getByText("por defecto").tagName).toBe("SPAN");
    expect(screen.getByText("como parrafo").tagName).toBe("P");
    expect(container.querySelectorAll("span, p")).toHaveLength(2);
  });

  it("no se oculta con ninguna propiedad que lo sacaría del árbol de accesibilidad", () => {
    /*
     * Regresión que este test previene: "simplificar" la receta a
     * `display: none`, `visibility: hidden` o el atributo `hidden` deja el
     * componente visualmente idéntico (invisible) pero SILENCIA el texto para
     * el lector de pantalla -- exactamente lo contrario de su propósito, y sin
     * ningún síntoma visible que lo delate.
     */
    renderWithProviders(<VisuallyHidden>aviso</VisuallyHidden>);
    const el = screen.getByText("aviso");
    const css = cssRuleTextFor(el);

    // Sonda positiva: el helper SÍ ve las reglas de este elemento -- sin ella,
    // los asserts de ausencia de abajo pasarían por vacuidad.
    expect(css).toContain("clip-path: inset(50%)");
    expect(css).toContain("position: absolute");

    expect(css).not.toContain("display: none");
    expect(css).not.toContain("visibility: hidden");
    expect(el).not.toHaveAttribute("hidden");
    expect(el).not.toHaveAttribute("aria-hidden");
  });

  it("no puede desplazar el layout: 1x1 px, sin desbordamiento y sin ajuste de línea", () => {
    renderWithProviders(
      <VisuallyHidden>
        un texto largo que dentro de una caja de un pixel de ancho generaria una
        columna altisima si se permitiera el ajuste de linea
      </VisuallyHidden>,
    );
    const css = cssRuleTextFor(screen.getByText(/un texto largo/));

    expect(css).toContain("width: 1px");
    expect(css).toContain("height: 1px");
    expect(css).toContain("overflow: hidden");
    expect(css).toContain("white-space: nowrap");
  });
});
