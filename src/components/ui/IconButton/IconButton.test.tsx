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

/* Acota las reglas a las clases reales del elemento renderizado. Tiene que
   recoger TODAS las clases que tienen alguna regla asociada, no solo la
   primera que matchee: IconButton es `styled(Button)`, así que el <button>
   final lleva DOS pares de clases -- las de ScButton (con el halo por
   variante que Button.tsx ya declara, y el aria-busy={loading} interno que
   este componente NO usa) y las de ScSquare (con el anillo de
   descubribilidad, la regla [aria-busy="true"] de Task 5, y la combinación
   [data-variant="ghost"]:focus-visible). Quedarse con la primera clase que
   matchee pierde aquí la mitad de las reglas -- exactamente el motivo por el
   que la primera versión del test de :focus-visible fallaba: encontraba las
   clases de ScButton y nunca llegaba a ver la regla combinada, que vive en
   las clases de ScSquare. Compartida entre los dos describe de este archivo
   que inspeccionan CSSOM (Task 5 y :focus-visible) — misma función, no
   duplicada. */
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

  it("propaga variant a Button: el color heredado cambia con la variante", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Solido"
        variant="solid"
      />,
    );
    const boton = screen.getByRole("button", { name: "Solido" });
    expect(boton).toHaveAttribute("data-variant", "solid");
    // variant="solid" en Button.tsx fija color: semantic.onBrand — un valor
    // distinto de "transparent" (ghost/outline/soft con background propio).
    expect(getComputedStyle(boton).backgroundColor).not.toBe("transparent");
  });

  /*
   * Crítica externa #10 (2026-08-18). Este candado sustituye a la mitad
   * "intent" del test de arriba, que pasaba `intent="danger"` — un valor del
   * union retirado en la misma revisión por inalcanzable, y una prop que
   * `IconButton` ya no expone.
   *
   * Lo que queda por candar no es la propagación de una prop que nadie pasa,
   * sino la PROPIEDAD que la retirada tenía que preservar y que sí se pinta en
   * producción: `IconButton` compone SIEMPRE el acento NEUTRO de `Button`
   * (`semantic.text`), nunca el `primary` (`brandSolid`) con el que `Button`
   * arranca por su cuenta. Es lo que pintan hoy ThemeToggle, BackToTop y los
   * dos disparadores de `NavSheet`: si alguien borrara el `intent="neutral"`
   * de `IconButton.tsx`, todos los botones de icono del sitio pasarían a
   * color de marca.
   *
   * Se lee del CSSOM inyectado y se compara contra el token importado (regla
   * 38), nunca contra un color escrito a mano.
   */
  it("crítica #10: compone el acento NEUTRO de Button (semantic.text), no el primary con el que Button arranca", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
      />,
    );
    const boton = screen.getByRole("button", { name: "Etiqueta" });
    const css = reglasDe(boton).join("\n");

    expect(css).toContain(`color: ${basicLightTheme.semantic.text}`);
    expect(css).not.toContain(`color: ${basicLightTheme.semantic.brandSolid}`);
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

  /*
   * Task 5 (plan premium F1-F5): indicador visual minimo de "en curso" —
   * opacity, sin prop nueva: la regla lee directamente el atributo
   * aria-busy que el consumidor (ThemeToggle.tsx) ya pasa como prop nativa.
   * Verificado con un bug inyectado a proposito (regla 34, RULES.md):
   * comentando la declaracion `opacity: 0.65;` de ScSquare en
   * IconButton.tsx, el primer test de este bloque se puso en rojo
   * (`getComputedStyle(...).opacity` volvia a leer cadena vacia con
   * aria-busy="true"); restaurada la declaracion, vuelve a verde.
   */
  describe("indicador visual de aria-busy (Task 5)", () => {
    it("con aria-busy='true' el boton reduce su opacity; sin el atributo, no", () => {
      renderWithProviders(
        <IconButton
          icon={<Icon />}
          aria-label="Etiqueta"
        />,
      );
      const boton = screen.getByRole("button", { name: "Etiqueta" });
      // jsdom no calcula un valor inicial para una propiedad que ninguna
      // regla fija (a diferencia de un navegador real): cadena vacia, no
      // "1". Lo que se afirma es la AUSENCIA del valor que solo declara la
      // regla [aria-busy="true"].
      expect(getComputedStyle(boton).opacity).not.toBe("0.65");

      boton.setAttribute("aria-busy", "true");
      expect(getComputedStyle(boton).opacity).toBe("0.65");

      boton.removeAttribute("aria-busy");
      expect(getComputedStyle(boton).opacity).not.toBe("0.65");
    });

    it('la regla [aria-busy="true"] declara opacity, NUNCA una propiedad de layout (regla dura §18)', () => {
      renderWithProviders(
        <IconButton
          icon={<Icon />}
          aria-label="Etiqueta"
        />,
      );
      const boton = screen.getByRole("button", { name: "Etiqueta" });
      const bloque = reglasDe(boton).find((regla) =>
        regla.includes('[aria-busy="true"]'),
      );
      expect(
        bloque,
        'no se encontro la regla [aria-busy="true"]',
      ).toBeDefined();
      expect(bloque).toContain("opacity");
    });

    it("bajo prefers-reduced-motion: reduce, la transicion de opacity se declara 'none' (candado local, independiente del reset global)", () => {
      renderWithProviders(
        <IconButton
          icon={<Icon />}
          aria-label="Etiqueta"
        />,
      );
      const boton = screen.getByRole("button", { name: "Etiqueta" });
      const reglas = reglasDe(boton);

      // jsdom no evalua NINGUN @media (task/lessons.md 2026-07-27): se
      // inspecciona el texto de la regla inyectada, no getComputedStyle. Tres
      // reglas distintas mencionan [aria-busy="true"] (la de reposo y sus dos
      // formas dentro/fuera del bloque @media, ver allCssRules/reglasDe): se
      // filtra por las DOS condiciones a la vez para quedarse con el bloque
      // @media -- no con su primera aparicion, que es la regla de reposo.
      const bloqueBusy = reglas.find(
        (regla) =>
          regla.includes('[aria-busy="true"]') &&
          regla.includes("prefers-reduced-motion: reduce"),
      );
      expect(
        bloqueBusy,
        'no se encontro el bloque @media de [aria-busy="true"]',
      ).toBeDefined();
      expect(bloqueBusy).toContain("transition: none");
    });
  });

  /*
   * Task 13, punto 2 del brief: IconButton NO redeclara touch-action --lo
   * hereda de ScButton por composición (`styled(Button)`, el mismo mecanismo
   * de herencia que ya explota la sección de `reglasDe`, más arriba). Este
   * test es el candado de esa herencia: si `touch-action: manipulation` se
   * borrara de Button.tsx, IconButton se quedaría sin ella y este test se
   * pondría en rojo, aunque IconButton.tsx no cambiara ni una línea.
   * Validado con el bug inyectado a propósito (ver informe de la tarea):
   * comentando temporalmente `touch-action: manipulation;` en Button.tsx,
   * este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: hereda touch-action: manipulation de ScButton (Button.tsx) por composición", () => {
    renderWithProviders(
      <IconButton
        icon={<Icon />}
        aria-label="Etiqueta"
      />,
    );
    const boton = screen.getByRole("button", { name: "Etiqueta" });
    const reglas = reglasDe(boton);
    expect(reglas.some((r) => r.includes("touch-action: manipulation"))).toBe(
      true,
    );
  });

  describe(":focus-visible propio (hallazgo 1, D7)", () => {
    afterEach(() => {
      window.localStorage.clear();
    });

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
