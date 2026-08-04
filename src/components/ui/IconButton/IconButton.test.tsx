import type { ReactElement } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { IconButton } from "./IconButton";

const Icon = (): ReactElement => (
  <svg
    aria-hidden="true"
    data-testid="icon"
  />
);

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

describe("IconButton", () => {
  it("size='md' renderiza un cuadrado de 44x44px", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
      />,
    );
    const boton = screen.getByRole("button", { name: "Etiqueta" });
    const estilo = getComputedStyle(boton);
    expect(estilo.width).toBe("44px");
    expect(estilo.height).toBe("44px");
  });

  it.each([
    ["sm", "36px"],
    ["md", "44px"],
    ["lg", "52px"],
  ] as const)("size='%s' renderiza un cuadrado de %s", (size, side) => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
        size={size}
      />,
    );
    const boton = screen.getByRole("button", { name: "Etiqueta" });
    expect(getComputedStyle(boton).width).toBe(side);
  });

  it("variant por defecto es 'ghost' (no el 'solid' por defecto de Button)", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
      />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "ghost");
  });

  it("propaga variant/intent a Button: el color heredado cambia con el intent", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Peligro"
        variant="solid"
        intent="danger"
      />,
    );
    const boton = screen.getByRole("button", { name: "Peligro" });
    expect(boton).toHaveAttribute("data-variant", "solid");
    // variant="solid" en Button.tsx fija color: semantic.onBrand — un valor
    // distinto de "transparent" (ghost/outline/soft con background propio).
    expect(getComputedStyle(boton).backgroundColor).not.toBe("transparent");
  });

  it("renderiza el icono recibido", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
      />,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("dispara onClick al hacer click", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
        onClick={onClick}
      />,
    );
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("aria-label es obligatorio: sin nombre visible, el nombre accesible viene de aria-label", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Cambiar a tema oscuro"
      />,
    );
    expect(
      screen.getByRole("button", { name: "Cambiar a tema oscuro" }),
    ).toBeInTheDocument();
  });

  describe(":focus-visible propio (hallazgo 1, D7)", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

    // Acota las reglas a las clases reales del elemento renderizado. Tiene
    // que recoger TODAS las clases que tienen alguna regla asociada, no solo
    // la primera que matchee: IconButton es `styled(Button)`, así que el
    // <button> final lleva DOS pares de clases -- las de ScButton (con el
    // halo por variante que Button.tsx ya declara) y las de ScSquare (con el
    // anillo de descubribilidad + la combinación
    // [data-variant="ghost"]:focus-visible). Quedarse con la primera clase
    // que matchee (como hace Button.test.tsx/Card.test.tsx, donde el
    // elemento SOLO tiene un componente propio) pierde aquí la mitad de las
    // reglas -- exactamente el motivo por el que la primera versión de este
    // test fallaba: encontraba las clases de ScButton y nunca llegaba a ver
    // la regla combinada, que vive en las clases de ScSquare.
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
      "variant='ghost' (por defecto): :focus-visible COMPONE el anillo de descubribilidad con el halo de foco, del tema %s",
      (nombreTema, theme) => {
        window.localStorage.setItem("vti-theme", nombreTema);
        renderWithProviders(
          <IconButton
            icon={<Icon />}
            aria-label="Etiqueta"
          />,
        );
        const boton = screen.getByRole("button", { name: "Etiqueta" });

        const bloque = reglasDe(boton).find(
          (regla) =>
            regla.includes('[data-variant="ghost"]:focus-visible') &&
            regla.includes("box-shadow"),
        );
        expect(
          bloque,
          'no se encontró la regla combinada [data-variant="ghost"]:focus-visible',
        ).toBeDefined();
        // Las DOS sombras en la MISMA declaración: el anillo de
        // descubribilidad (currentColor) del reposo ghost, y el halo nuevo
        // contra el token de foco del tema activo -- ninguna sustituye a la
        // otra.
        expect(bloque).toContain("currentColor");
        expect(bloque).toContain(theme.semantic.focus);
      },
    );
  });
});
