import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { basicLightTheme } from "@/theme/themes";
import { Kicker } from "./Kicker";

/**
 * Candados del primitivo `Kicker` (integración de la ola K, crítica externa
 * #15). jsdom no hace layout: todo lo que sea CSS se comprueba por el TEXTO
 * de las reglas inyectadas por styled-components, nunca por observación.
 */
function reglasDe(el: Element): string[] {
  const clases = [...el.classList];
  const reglas: string[] = [];
  for (const hoja of document.styleSheets) {
    let lista: CSSRuleList;
    try {
      lista = hoja.cssRules;
    } catch {
      continue;
    }
    for (const regla of lista) {
      const texto = regla.cssText;
      if (clases.some((c) => texto.includes(`.${c}`))) reglas.push(texto);
    }
  }
  return reglas;
}

describe("Kicker", () => {
  it("es un <span> (variante overline fija), en versalitas y color de marca", () => {
    renderWithProviders(<Kicker>Historia</Kicker>);
    const el = screen.getByText("Historia");

    expect(el.tagName).toBe("SPAN");
    const css = reglasDe(el).join("\n");
    expect(css).toContain("text-transform: uppercase");
    expect(css).toContain(basicLightTheme.semantic.brandText);
  });

  it("pinta la regla decorativa como ::before del propio kicker, sin ningún hijo en el DOM", () => {
    renderWithProviders(<Kicker>Historia</Kicker>);
    const el = screen.getByText("Historia");

    expect(el.childElementCount).toBe(0);
    const before = reglasDe(el).find((r) => r.includes("::before"));
    expect(
      before,
      "el kicker con regla no declara ningún ::before en la hoja",
    ).toBeDefined();
    expect(before).toContain("width: 1.75rem");
    expect(before).toContain("height: 2px");
    expect(before).toContain("currentColor");
  });

  it("sin regla (withRule={false}) no declara el ::before", () => {
    renderWithProviders(<Kicker withRule={false}>Historia</Kicker>);
    const el = screen.getByText("Historia");

    expect(reglasDe(el).some((r) => r.includes("::before"))).toBe(false);
  });

  it("no expone variant: un kicker no puede escalarse a encabezado", () => {
    // @ts-expect-error -- variant no forma parte de las props del primitivo
    renderWithProviders(<Kicker variant="h2">Historia</Kicker>);
    expect(screen.getByText("Historia").tagName).toBe("SPAN");
  });
});
