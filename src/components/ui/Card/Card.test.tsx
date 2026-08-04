import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { Card } from "./Card";

/** Mismo patrón que Button.test.tsx/Navbar.test.tsx: lee el CSSOM real
 *  inyectado por styled-components, porque jsdom no evalúa la pseudo-clase
 *  dinámica :focus-visible al resolver getComputedStyle. */
function allCssRules(): string[] {
  const reglas: string[] = [];
  const walk = (rules: CSSRuleList): void => {
    Array.from(rules).forEach((rule) => {
      reglas.push(rule.cssText);
      const anidadas = (rule as CSSGroupingRule).cssRules;
      if (anidadas) walk(anidadas);
    });
  };
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      walk(sheet.cssRules);
    } catch {
      /* hoja inaccesible: no aporta */
    }
  });
  return reglas;
}

describe("Card", () => {
  it("renderiza su contenido", () => {
    renderWithProviders(<Card>Contenido</Card>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("interactive expone role de foco (tabindex/link)", () => {
    renderWithProviders(
      <Card
        interactive
        as="a"
        href="#x"
      >
        Link
      </Card>,
    );
    expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument();
  });

  it("estática (sin interactive) no expone ningún rol interactivo", () => {
    renderWithProviders(<Card>Superficie plana</Card>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("interactive renderizado como button vía as expone rol de button (as es realmente polimórfico)", () => {
    renderWithProviders(
      <Card
        interactive
        as="button"
      >
        Acción
      </Card>,
    );
    expect(screen.getByRole("button", { name: "Acción" })).toBeInTheDocument();
  });

  it("interactive sin as ni href no queda alcanzable por teclado (contrato documentado: no se inventan role/tabIndex)", () => {
    renderWithProviders(<Card interactive>Sin foco</Card>);
    const el = screen.getByText("Sin foco");
    expect(el.tagName).toBe("DIV");
    expect(el).not.toHaveAttribute("role");
    expect(el).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("propaga props nativas (onClick, data-testid) al contenedor", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Card
        onClick={onClick}
        data-testid="card-x"
      >
        Click
      </Card>,
    );
    const el = screen.getByTestId("card-x");
    el.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe(":focus-visible propio de la variante interactive (hallazgo 1, D7)", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    // Acota las reglas a la clase real del elemento renderizado: las dos
    // iteraciones de tema comparten `document` (styled-components no limpia
    // su hoja entre tests), así que un `find()` sin acotar podría devolver
    // la regla del PRIMER render, del tema equivocado.
    function reglasDe(el: HTMLElement): string[] {
      const reglas = allCssRules();
      const clases = Array.from(el.classList).filter((c) =>
        reglas.some((r) => r.includes(c)),
      );
      expect(
        clases.length,
        "no se encontró ninguna clase inyectada del elemento",
      ).toBeGreaterThan(0);
      return reglas.filter((r) => clases.some((c) => r.includes(c)));
    }

    it.each([
      ["light", basicLightTheme],
      ["dark", basicDarkTheme],
    ] as const)(
      "interactive declara :focus-visible con box-shadow contra semantic.focus del tema %s (nunca un literal)",
      (nombreTema, theme) => {
        window.localStorage.setItem("vti-theme", nombreTema);
        renderWithProviders(
          <Card
            interactive
            as="a"
            href="#x"
          >
            Link
          </Card>,
        );
        const link = screen.getByRole("link", { name: "Link" });

        const bloque = reglasDe(link).find(
          (regla) =>
            regla.includes(":focus-visible") && regla.includes("box-shadow"),
        );
        expect(
          bloque,
          "no se encontró ninguna regla :focus-visible con box-shadow en Card",
        ).toBeDefined();
        expect(bloque).toContain(theme.semantic.focus);
        expect(bloque).toContain(theme.semantic.borderStrong);
        // No sustituye el anillo global (regla dura: outline: none vetado).
        expect(
          reglasDe(link).some((regla) => /outline\s*:\s*none/.test(regla)),
        ).toBe(false);
      },
    );

    it("la card estática (sin interactive) no gana ningún :focus-visible propio (contrato: el tratamiento vive solo en la rama interactive)", () => {
      renderWithProviders(<Card>Superficie plana</Card>);
      const el = screen.getByText("Superficie plana");

      const bloque = reglasDe(el).find(
        (regla) =>
          regla.includes(":focus-visible") && regla.includes("box-shadow"),
      );
      expect(bloque).toBeUndefined();
    });
  });
});
