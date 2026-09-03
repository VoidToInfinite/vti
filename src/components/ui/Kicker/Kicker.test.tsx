import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { basicLightTheme } from "@/theme/themes";
import { space } from "@/theme/tokens/space";
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

  /*
   * Crítica externa #17 (2026-09-03): el separador entre la regla y el texto
   * era `gap: 0.75rem` escrito a mano, duplicando `space[3]` byte a byte.
   *
   * La aserción se escribe contra el TOKEN IMPORTADO, nunca contra la cadena
   * "0.75rem": un candado de literal no distingue un token de un literal que
   * resuelve a lo mismo (`task/lessons.md`, 2026-08-12), así que comprobar el
   * texto suelto dejaría pasar exactamente el defecto que este test cierra.
   * Con el token en la aserción, recalibrar `space[3]` mueve las dos partes a
   * la vez o deja este candado en rojo.
   *
   * El `gap` vive dentro de la rama `$withRule`, que en el CSS inyectado cae
   * en la MISMA regla que el resto de las declaraciones del kicker (no en el
   * `::before`), así que se busca sobre el conjunto de reglas de la clase.
   */
  it("el separador entre la regla y el texto lee space[3], no un literal suelto", () => {
    renderWithProviders(<Kicker>Historia</Kicker>);
    const el = screen.getByText("Historia");

    const css = reglasDe(el)
      .filter((r) => !r.includes("::before"))
      .join("\n");
    expect(css).toContain(`gap: ${space[3]}`);
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
