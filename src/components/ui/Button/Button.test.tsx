import { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { PRESS } from "@/motion/vocabulary";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { Button } from "./Button";

/** Texto CSS de todas las reglas inyectadas por styled-components, planas
 *  (incluidas las anidadas dentro de selectores como &:focus-visible): mismo
 *  patrón que Navbar.test.tsx/Eye.test.tsx. jsdom no evalúa pseudo-clases
 *  dinámicas como :focus-visible al calcular getComputedStyle (no hay
 *  "modalidad de foco" real sin un navegador), así que la única forma fiable
 *  de atar la regla es leer el CSSOM que styled-components ya inyectó. */
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

describe("Button", () => {
  it("renderiza como button con su label", () => {
    renderWithProviders(<Button>Explorar</Button>);
    expect(
      screen.getByRole("button", { name: "Explorar" }),
    ).toBeInTheDocument();
  });

  it("en loading marca aria-busy y deshabilita", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    const b = screen.getByRole("button");
    expect(b).toHaveAttribute("aria-busy", "true");
    expect(b).toBeDisabled();
  });

  it("en loading conserva el label en el DOM (el ancho no salta)", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    expect(screen.getByText("Enviar")).toBeInTheDocument();
  });

  it("en loading conserva el nombre accesible del botón (el label se oculta con opacity, no visibility)", () => {
    renderWithProviders(<Button loading>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeInTheDocument();
  });

  it("no dispara onClick si está disabled", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        disabled
        onClick={onClick}
      >
        X
      </Button>,
    );
    const b = screen.getByRole("button");
    expect(b).toBeDisabled();
    b.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("no dispara onClick si está loading", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        loading
        onClick={onClick}
      >
        X
      </Button>,
    );
    screen.getByRole("button").click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("dispara onClick cuando está habilitado", () => {
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Guardar</Button>);
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["solid", "primary"],
    ["solid", "neutral"],
    ["solid", "success"],
    ["solid", "danger"],
    ["soft", "primary"],
    ["soft", "neutral"],
    ["soft", "success"],
    ["soft", "danger"],
    ["outline", "primary"],
    ["outline", "neutral"],
    ["outline", "success"],
    ["outline", "danger"],
    ["ghost", "primary"],
    ["ghost", "neutral"],
    ["ghost", "success"],
    ["ghost", "danger"],
  ] as const)(
    "renderiza sin fallar con variant='%s' e intent='%s'",
    (variant, intent) => {
      renderWithProviders(
        <Button
          variant={variant}
          intent={intent}
        >
          Botón
        </Button>,
      );
      expect(screen.getByRole("button", { name: "Botón" })).toBeInTheDocument();
    },
  );

  it.each(["sm", "md", "lg"] as const)(
    "renderiza sin fallar con size='%s'",
    (size) => {
      renderWithProviders(<Button size={size}>Tamaño {size}</Button>);
      expect(
        screen.getByRole("button", { name: `Tamaño ${size}` }),
      ).toBeInTheDocument();
    },
  );

  /*
   * Task 9 (craft de interacción, punto 4 del brief): la curva del press
   * (transform, compartida con el hover-lift) migra de motion.easing.standard
   * a vocabulary.PRESS.easing -- primera adopción real de PRESS.
   * background-color se queda con motion.easing.standard, sin tocar.
   * Validado con el bug inyectado a propósito (ver informe de la tarea,
   * tabla Button): revirtiendo temporalmente la entrada de transform de
   * PRESS.durationMs/PRESS.easing a motion.duration.fast/easing.standard en
   * Button.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 9: la transition de transform usa PRESS.durationMs/PRESS.easing, background-color se queda en motion.easing.standard", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const transitionRule = propias.find(
      (r) => r.includes("transition") && r.includes("transform"),
    );
    expect(transitionRule).toBeDefined();
    expect(transitionRule).toContain(`${PRESS.durationMs}ms`);
    expect(transitionRule).toContain(PRESS.easing);
    expect(transitionRule).toContain(basicLightTheme.motion.easing.standard);
  });

  /*
   * Task 19 (punto 5 del brief, inventario de hoverGuard por grep de `:hover`
   * fuera de `@media (hover: hover)`): Button.tsx era, hasta esta tarea, el
   * ÚNICO de las ~10 familias pulsables del sitio con un hover-lift que MUEVE
   * (translateY) sin `PRESS.hoverGuard` -- pese a ser el propio origen citado
   * por el docblock de `PRESS.hoverLift` en `vocabulary.ts`. Validado con el
   * bug inyectado a propósito (ver informe de la tarea): quitando el bloque
   * `@media ${PRESS.hoverGuard}` de Button.tsx (dejando el `:hover` suelto),
   * este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 19: el hover-lift (translateY) vive dentro de PRESS.hoverGuard -- (hover: hover) and (pointer: fine)", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const guardado = propias.some(
      (r) =>
        r.includes(`@media ${PRESS.hoverGuard}`) &&
        r.includes(":hover") &&
        r.includes("translateY(-2px)"),
    );
    expect(
      guardado,
      "el hover-lift de Button no está guardado tras PRESS.hoverGuard",
    ).toBe(true);
  });

  /*
   * Fix de revisión (Task 19): `&:hover, &:active { transform: none }` bajo
   * `prefers-reduced-motion: reduce` compilaba a especificidad (0,2,0) --
   * menor que la de las reglas reales que quiere anular,
   * `&:hover:not(:disabled):not([aria-disabled="true"])` (0,4,0): `:not()`
   * toma la especificidad de su argumento, así que cada uno de los dos
   * `:not()` suma un punto sobre el simple `:hover`. Con menor especificidad
   * el guard nunca gana, pese a venir después en la hoja: bajo `reduce`,
   * `transform: translateY(-2px)` seguía aplicándose en `:hover` (el
   * colapso global de `transition-duration` lo dejaba como salto instantáneo
   * de 2px en vez de movimiento animado, pero seguía siendo movimiento).
   *
   * jsdom no simula pseudo-clases dinámicas (`:hover`/`:active`) al resolver
   * `getComputedStyle` (mismo motivo que `:focus-visible`, ver el docblock de
   * `allCssRules`), así que este candado no puede medir "quién gana la
   * cascada" directamente -- mide que el SELECTOR del guard tiene la MISMA
   * forma (mismos `:not()`) que las reglas reales, que es la condición que
   * garantiza la victoria por especificidad. La victoria real (transform se
   * queda en "none" bajo reduce con el ratón encima) se verificó en
   * navegador real (informe de la tarea).
   *
   * Validado con el bug inyectado a propósito: quitando los dos `:not(...)`
   * del guard de `reduce` (dejando `&:hover, &:active` a secas, el código
   * previo a este fix), este test se pone en rojo; restaurado, vuelve a
   * verde.
   */
  it("Task 19 (fix de revisión): el guard de reduce iguala la especificidad de :hover/:active reales -- (0,4,0), no (0,2,0)", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    const reduceBlock = propias.find(
      (r) =>
        r.includes("prefers-reduced-motion: reduce") &&
        r.includes("transform: none"),
    );
    expect(
      reduceBlock,
      "no se encontró el bloque de reduce con transform: none",
    ).toBeDefined();
    expect(reduceBlock).toContain(
      ':hover:not(:disabled):not([aria-disabled="true"])',
    );
    expect(reduceBlock).toContain(
      ':active:not(:disabled):not([aria-disabled="true"])',
    );
  });

  /*
   * Task 13, punto 2 del brief: elimina el retardo de ~300ms de doble-tap.
   * Raíz de composición -- IconButton (`styled(Button)`) y todo lo que
   * compone sobre él (BackToTop, ThemeToggle) heredan esta declaración sin
   * repetirla. Validado con el bug inyectado a propósito (ver informe de la
   * tarea): comentando temporalmente `touch-action: manipulation;` en
   * Button.tsx, este test se pone en rojo; restaurado, vuelve a verde.
   */
  it("Task 13: declara touch-action: manipulation", () => {
    renderWithProviders(<Button>Explorar</Button>);
    const boton = screen.getByRole("button", { name: "Explorar" });
    const reglas = allCssRules();
    const clases = Array.from(boton.classList).filter((c) =>
      reglas.some((r) => r.includes(c)),
    );
    const propias = reglas.filter((r) => clases.some((c) => r.includes(c)));

    expect(propias.some((r) => r.includes("touch-action: manipulation"))).toBe(
      true,
    );
  });

  it("acepta el ref como prop (React 19, sin forwardRef) y apunta al <button>", () => {
    const ref = createRef<HTMLButtonElement>();
    renderWithProviders(<Button ref={ref}>Con ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("con as='a' y href se anuncia como enlace, no como boton", () => {
    renderWithProviders(
      <Button
        as="a"
        href="https://example.invalid/x"
      >
        Ir
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ir" })).toHaveAttribute(
      "href",
      "https://example.invalid/x",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("propaga props nativas del <button> (type, aria-label, onClick)", () => {
    const onClick = vi.fn();
    renderWithProviders(
      <Button
        type="submit"
        aria-label="Enviar formulario"
        onClick={onClick}
      >
        Enviar
      </Button>,
    );
    const b = screen.getByRole("button", { name: "Enviar formulario" });
    expect(b).toHaveAttribute("type", "submit");
    b.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("con as='a' y disabled no emite el atributo disabled, marca aria-disabled y retira el href", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
        disabled
      >
        Ir
      </Button>,
    );
    // Sin href, el <a> deja de tener rol "link" (HTML-AAM), así que se
    // localiza por el texto y se sube al elemento <a> real con closest.
    const anchor = screen.getByText("Ir").closest("a");
    expect(anchor).not.toBeNull();
    expect(anchor).not.toHaveAttribute("disabled");
    expect(anchor).toHaveAttribute("aria-disabled", "true");
    expect(anchor).not.toHaveAttribute("href");
  });

  it("con as='a' y disabled queda fuera del orden de tabulación", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
        disabled
      >
        Ir
      </Button>,
    );
    const anchor = screen.getByText("Ir").closest("a");
    expect(anchor).toHaveAttribute("tabindex", "-1");
  });

  it("el <button> deshabilitado sigue usando el atributo nativo disabled (no-regresion)", () => {
    renderWithProviders(<Button disabled>Enviar</Button>);
    const b = screen.getByRole("button", { name: "Enviar" });
    expect(b).toHaveAttribute("disabled");
    expect(b).not.toHaveAttribute("aria-disabled");
  });

  it("con as='a' sin disabled conserva el href y no lleva aria-disabled", () => {
    renderWithProviders(
      <Button
        as="a"
        href="/x"
      >
        Ir
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Ir" });
    expect(link).toHaveAttribute("href", "/x");
    expect(link).not.toHaveAttribute("aria-disabled");
  });

  describe(":focus-visible propio (hallazgo 1, D7)", () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    afterEach(() => {
      window.localStorage.clear();
    });

    // Localiza, para un render concreto, la clase que styled-components le
    // asignó de verdad (identificada porque ALGUNA regla inyectada la
    // menciona) y devuelve solo las reglas que la mencionan. Es obligatorio
    // acotar así: este describe renderiza varias variantes/temas en el MISMO
    // `document` a lo largo de la suite (styled-components no limpia su
    // hoja de estilos entre tests), así que buscar ":focus-visible" sin
    // acotar por clase puede devolver la regla de UN RENDER ANTERIOR -- el
    // primer `.find()` de una versión previa de este test lo demostró: el
    // filtro genérico encontraba la regla de la variante `solid` (renderizada
    // muchas veces antes en la suite) en vez de la de `outline`, y la
    // aserción sobre `inset` fallaba por el motivo equivocado.
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
      "variante solid: declara :focus-visible con box-shadow contra semantic.focus del tema %s (nunca un literal)",
      (nombreTema, theme) => {
        window.localStorage.setItem("vti-theme", nombreTema);
        renderWithProviders(<Button variant="solid">Guardar</Button>);
        const boton = screen.getByRole("button", { name: "Guardar" });

        const bloque = reglasDe(boton).find(
          (regla) =>
            regla.includes(":focus-visible") && regla.includes("box-shadow"),
        );
        expect(
          bloque,
          "no se encontró ninguna regla :focus-visible con box-shadow",
        ).toBeDefined();
        expect(bloque).toContain(theme.semantic.focus);
        // No sustituye el anillo global: ninguna regla de ESTA clase
        // declara `outline: none` (regla dura del repo, vetada desde el
        // sistema de lujo) en ningún selector, no solo en :focus-visible.
        expect(
          reglasDe(boton).some((regla) => /outline\s*:\s*none/.test(regla)),
        ).toBe(false);
      },
    );

    it("variante outline: :focus-visible COMPONE el halo con el anillo inset propio, no lo sustituye", () => {
      renderWithProviders(<Button variant="outline">Cancelar</Button>);
      const boton = screen.getByRole("button", { name: "Cancelar" });

      const bloque = reglasDe(boton).find(
        (regla) =>
          regla.includes(":focus-visible") && regla.includes("box-shadow"),
      );
      expect(bloque).toBeDefined();
      // Las DOS capas tienen que convivir en la MISMA declaración
      // (box-shadow no fusiona entre reglas distintas): el anillo inset de
      // la variante outline (inset ...) y el halo nuevo (color-mix con
      // semantic.focus), separados por coma.
      expect(bloque).toContain("inset");
      expect(bloque).toContain(basicLightTheme.semantic.borderStrong);
      expect(bloque).toContain(basicLightTheme.semantic.focus);
    });

    it("las cuatro variantes declaran su propio :focus-visible (ninguna depende solo del anillo global)", () => {
      const variantes = ["solid", "soft", "outline", "ghost"] as const;
      const botones: HTMLElement[] = [];
      for (const variant of variantes) {
        window.localStorage.clear();
        renderWithProviders(
          <Button
            key={variant}
            variant={variant}
          >
            {`Variante ${variant}`}
          </Button>,
        );
        botones.push(
          screen.getByRole("button", { name: `Variante ${variant}` }),
        );
      }

      for (const boton of botones) {
        const tieneFocusVisible = reglasDe(boton).some((regla) =>
          regla.includes(":focus-visible"),
        );
        expect(
          tieneFocusVisible,
          `la variante del botón "${boton.textContent}" no declara :focus-visible propio`,
        ).toBe(true);
      }
    });
  });
});
