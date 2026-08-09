import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
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

/** Acota las reglas a la clase real del elemento renderizado: las dos
 *  iteraciones de tema comparten document (styled-components no limpia su
 *  hoja entre tests), así que un find() sin acotar podría devolver la regla
 *  del PRIMER render, del tema equivocado. Compartido por los describe de
 *  más abajo (:focus-visible y craft de interacción, Task 9). */
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

  /*
   * Task 9 (craft de interacción): la card interactiva gana
   * :active { transform: scale(...) } (vocabulary.PRESS), su hover-lift
   * pasa a guardarse tras PRESS.hoverGuard (mueve, translateY) y box-shadow
   * se añade a la lista de transition (hoy saltaba de elevation[0] a
   * elevation[1] sin transición). Validado con el bug inyectado a
   * propósito (ver informe de la tarea, tabla Card): comentando
   * temporalmente cada bloque en Card.tsx el test correspondiente se pone
   * en rojo; restaurado, vuelve a verde.
   */
  describe("craft de interacción (Task 9, vocabulary.PRESS)", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    it("declara :active con transform: scale(PRESS.activeScale) y transition de transform con PRESS.durationMs/PRESS.easing", () => {
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
      const reglas = reglasDe(link);

      const activeRule = reglas.find(
        (r) => r.includes(":active") && r.includes("transform"),
      );
      expect(
        activeRule,
        "no se encontró ninguna regla :active con transform",
      ).toBeDefined();
      expect(activeRule).toContain(`scale(${PRESS.activeScale})`);

      const transitionRule = reglas.find(
        (r) => r.includes("transition") && r.includes("box-shadow"),
      );
      expect(
        transitionRule,
        "box-shadow no está en la lista de transition",
      ).toBeDefined();
      expect(transitionRule).toContain(`${PRESS.durationMs}ms`);
      expect(transitionRule).toContain(PRESS.easing);
    });

    it("el hover-lift (translateY) vive dentro de PRESS.hoverGuard -- (hover: hover) and (pointer: fine)", () => {
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
      const reglas = reglasDe(link);

      const guardado = reglas.some(
        (r) =>
          r.includes(`@media ${PRESS.hoverGuard}`) &&
          r.includes(":hover") &&
          r.includes("translateY(-2px)"),
      );
      expect(
        guardado,
        "el hover-lift de la card no está guardado tras PRESS.hoverGuard",
      ).toBe(true);
    });

    it("el guard de prefers-reduced-motion anula el transform de :hover Y de :active", () => {
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
      const reglas = reglasDe(link);

      const guard = reglas.filter((r) =>
        r.includes("@media (prefers-reduced-motion: reduce)"),
      );
      expect(guard.length).toBeGreaterThan(0);
      const texto = guard.join("\n");
      expect(texto).toContain("transition: none");
      expect(texto).toContain(":hover");
      expect(texto).toContain(":active");
      expect(texto).toContain("transform: none");
    });
  });
});
