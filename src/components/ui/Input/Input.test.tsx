import { createRef } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { basicDarkTheme, basicLightTheme } from "@/theme/themes";
import { contrastRatio } from "@/theme/tokens/contrast";
import { Field, Input } from "./Input";

/** Mismo patrón que Button.test.tsx/Navbar.test.tsx: lee el CSSOM real
 *  inyectado por styled-components, porque jsdom no evalúa la pseudo-clase
 *  dinámica :focus-visible al resolver getComputedStyle (no hay "modalidad
 *  de foco" real sin un navegador). */
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

// Tipo real de `children` de Field, derivado del propio componente (en vez
// de repetir/adivinar el tipo interno no exportado `FieldControlProps`).
// Se usa solo para el cast deliberado del test de "más de un hijo" — ver
// más abajo por qué ese test necesita violar el tipo a propósito.
type FieldChildren = Parameters<typeof Field>[0]["children"];

describe("Input / Field", () => {
  it("asocia label con el control", () => {
    renderWithProviders(
      <Field
        label="Email"
        htmlFor="email"
      >
        <Input id="email" />
      </Field>,
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  // `ScLabel` usa `htmlFor={htmlFor}` para asociar la etiqueta con el
  // control; sin que `Field` inyecte también ese `id` al hijo, la
  // asociación se rompe en cuanto el consumidor olvida pasar un `id` que
  // coincida a mano con `htmlFor`.
  it("inyecta el id del control a partir de htmlFor cuando el hijo no trae id explícito", () => {
    renderWithProviders(
      <Field
        label="Usuario"
        htmlFor="auto-id"
      >
        <Input />
      </Field>,
    );
    const control = screen.getByLabelText("Usuario");
    expect(control).toHaveAttribute("id", "auto-id");
  });

  // Igual que con aria-describedby/aria-invalid: si el hijo ya trae un id
  // explícito (aunque no coincida con htmlFor), Field no lo pisa.
  it("respeta el id que el hijo ya trae explícito en vez de sobrescribirlo con htmlFor", () => {
    renderWithProviders(
      <Field
        label="Usuario"
        htmlFor="field-for"
      >
        <Input id="input-own-id" />
      </Field>,
    );
    expect(document.getElementById("input-own-id")).toBeInTheDocument();
    expect(document.getElementById("field-for")).not.toBeInTheDocument();
  });

  // El borde de error de `ScInput` se deriva del selector de atributo
  // `&[aria-invalid="true"]`, no de un prop `$error` aparte — así el estado
  // visual nunca puede desincronizarse del estado accesible. Con
  // `css: false` (ver test-utils/setup) no se puede aserta el estilo
  // computado en jsdom, así que la aserción de `aria-invalid="true"` en los
  // dos tests siguientes ES la prueba de regresión para el borde: si el
  // atributo está puesto, el CSS ya garantiza el borde rojo por construcción.
  it("marca aria-invalid con error", () => {
    renderWithProviders(
      <Input
        aria-invalid
        error
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("deriva aria-invalid del prop error sin necesitar pasarlo explícitamente (Input suelto, sin Field)", () => {
    renderWithProviders(<Input error />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("sin error no queda marcado como inválido", () => {
    renderWithProviders(<Input />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
  });

  it("conecta el texto de ayuda (help) al control vía aria-describedby", () => {
    renderWithProviders(
      <Field
        label="Usuario"
        htmlFor="user"
        help="Mínimo 4 caracteres"
      >
        <Input id="user" />
      </Field>,
    );
    expect(screen.getByLabelText("Usuario")).toHaveAccessibleDescription(
      "Mínimo 4 caracteres",
    );
  });

  it("conecta el mensaje de error al control vía aria-describedby y marca aria-invalid (Field, mismo criterio de atributo que Input suelto)", () => {
    renderWithProviders(
      <Field
        label="Email"
        htmlFor="email2"
        error="Formato inválido"
      >
        <Input id="email2" />
      </Field>,
    );
    const control = screen.getByLabelText("Email");
    expect(control).toHaveAccessibleDescription("Formato inválido");
    expect(control).toHaveAttribute("aria-invalid", "true");
  });

  it("fusiona aria-describedby con el que ya trae el consumidor en vez de sobrescribirlo", () => {
    renderWithProviders(
      <Field
        label="Usuario"
        htmlFor="user2"
        help="Mínimo 4 caracteres"
      >
        <Input
          id="user2"
          aria-describedby="hint-externo"
        />
      </Field>,
    );
    const control = screen.getByLabelText("Usuario");
    expect(control).toHaveAttribute(
      "aria-describedby",
      "hint-externo user2-help",
    );
  });

  it("fusiona aria-describedby sin duplicar un id que el consumidor ya hubiera incluido", () => {
    renderWithProviders(
      <Field
        label="Usuario"
        htmlFor="user3"
        error="Requerido"
      >
        <Input
          id="user3"
          aria-describedby="hint-externo user3-error"
        />
      </Field>,
    );
    const control = screen.getByLabelText("Usuario");
    expect(control).toHaveAttribute(
      "aria-describedby",
      "hint-externo user3-error",
    );
  });

  it("con error y help a la vez, solo el error queda anunciado (decisión documentada en Field)", () => {
    renderWithProviders(
      <Field
        label="Contraseña"
        htmlFor="pwd"
        help="Debe incluir un número"
        error="Contraseña muy corta"
      >
        <Input id="pwd" />
      </Field>,
    );
    const control = screen.getByLabelText("Contraseña");
    expect(control).toHaveAccessibleDescription("Contraseña muy corta");
    expect(
      screen.queryByText("Debe incluir un número"),
    ).not.toBeInTheDocument();
  });

  it("genera el id del mensaje de forma determinista a partir de htmlFor (no aleatoria)", () => {
    renderWithProviders(
      <Field
        label="Email"
        htmlFor="email3"
        error="Requerido"
      >
        <Input id="email3" />
      </Field>,
    );
    expect(document.getElementById("email3-error")).toHaveTextContent(
      "Requerido",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-describedby",
      "email3-error",
    );
  });

  it("sin help ni error no añade aria-describedby", () => {
    renderWithProviders(
      <Field
        label="Nombre"
        htmlFor="name"
      >
        <Input id="name" />
      </Field>,
    );
    expect(screen.getByLabelText("Nombre")).not.toHaveAttribute(
      "aria-describedby",
    );
  });

  it("acepta el ref como prop (React 19, sin forwardRef) y apunta al <input>", () => {
    const ref = createRef<HTMLInputElement>();
    renderWithProviders(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBe(screen.getByRole("textbox"));
  });

  it("propaga props nativas del <input> (type, placeholder, onChange)", () => {
    const onChange = vi.fn();
    renderWithProviders(
      <Input
        type="email"
        placeholder="tu@correo.com"
        onChange={onChange}
      />,
    );
    const input = screen.getByPlaceholderText("tu@correo.com");
    expect(input).toHaveAttribute("type", "email");
  });

  it("respeta disabled nativo", () => {
    renderWithProviders(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("lanza un error explícito si el hijo de Field es un Fragment (no reenvía props al DOM)", () => {
    // Un Fragment con un único hijo pasa Children.only (es "un" elemento),
    // pero no reenvía props al DOM: sin este guard, aria-describedby/
    // aria-invalid se perderían en silencio. Se silencia console.error
    // porque React también registra ahí el error de render no capturado.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() =>
      renderWithProviders(
        <Field
          label="Usuario"
          htmlFor="frag"
        >
          <>
            <Input id="frag" />
          </>
        </Field>,
      ),
    ).toThrow(/Fragment/);
    consoleError.mockRestore();
  });

  it("lanza un error explícito si Field recibe más de un hijo (Children.only)", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    // `FieldProps.children` tipa un único `ReactElement`, así que pasar un
    // array no compila en uso normal. Este cast deliberado (`as unknown as
    // FieldChildren`) simula el único hueco real: un consumidor con un `any`
    // de por medio, o el propio Fragment-con-varios-hijos que sí typechequea
    // (siguiente test). Lo que se prueba aquí es que, aun si el tipo se
    // burla, `Children.only` sigue protegiendo en runtime.
    const multipleChildren = [
      <Input
        key="a"
        id="multi-a"
      />,
      <Input
        key="b"
        id="multi-b"
      />,
    ] as unknown as FieldChildren;
    expect(() =>
      renderWithProviders(
        <Field
          label="Usuario"
          htmlFor="multi"
        >
          {multipleChildren}
        </Field>,
      ),
    ).toThrow();
    consoleError.mockRestore();
  });

  /*
   * ESTE BLOQUE SE DIO LA VUELTA el 2026-09-02 (crítica externa #14, P1 de
   * Craft). Ataba que `ScInput` declarase un halo PROPIO de `:focus-visible`
   * (box-shadow de 4px contra `semantic.focus`) además del anillo global;
   * ese halo se retiró al unificar el anillo de foco del sitio en una sola
   * declaración (`GlobalStyles.tsx`, geometría en
   * `src/theme/tokens/focus.ts`).
   *
   * Lo que este bloque protege NO cambia de intención: que el estado de foco
   * de un campo de texto siga completo. Cambia qué lo compone -- el anillo
   * ahora es el global y solo el global -- y se conserva íntegra la mitad que
   * SÍ es propia del campo y que ninguna unificación toca: el refuerzo de
   * `border-color` bajo `&:focus` (no `:focus-visible`), con su medición de
   * contraste.
   */
  describe("foco del campo (crítica #14, P1: anillo global + refuerzo de borde propio)", () => {
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
      "no declara anillo propio de :focus-visible en el tema %s, y sigue reforzando border-color bajo &:focus",
      (nombreTema, theme) => {
        window.localStorage.setItem("vti-theme", nombreTema);
        renderWithProviders(<Input />);
        const input = screen.getByRole("textbox");

        const reglas = reglasDe(input);
        /*
         * El anillo lo pone GlobalStyles y solo GlobalStyles. Se ata el
         * MECANISMO -- ninguna regla de `:focus-visible` de este componente
         * pinta anillo, ni con box-shadow ni con outline -- y no el color:
         * `semantic.focus` coincide en claro con algún acento del sitio
         * (medido), así que un candado por color daría rojo por el motivo
         * equivocado.
         */
        expect(
          reglas.filter(
            (regla) =>
              regla.includes(":focus-visible") &&
              (regla.includes("box-shadow") || regla.includes("outline")),
          ),
          "ScInput volvió a declarar un anillo de foco propio",
        ).toEqual([]);

        // &:focus (no :focus-visible) sigue reforzando border-color: sigue
        // siendo la decisión correcta para un input de texto (documentada en
        // el propio componente), así que este test también es la regresión
        // de que NO se reemplazó por :focus-visible.
        const bloqueFocus = reglas.find(
          (regla) =>
            regla.includes(":focus") &&
            !regla.includes(":focus-visible") &&
            regla.includes("border-color"),
        );
        expect(
          bloqueFocus,
          "no se encontró la regla &:focus que refuerza border-color",
        ).toBeDefined();

        /*
         * Esta aserción decía `toContain(theme.semantic.borderStrong)` y se
         * cambió el 2026-08-14 (QA §6). Atar un TOKEN concreto no ataba lo
         * que el bloque promete: `borderStrong` da 1,999:1 en claro y 2,406:1
         * en oscuro y, con el reposo corregido a `neutral[600]` (3,112 y
         * 4,060), enfocar el campo lo habría DEBILITADO — el test habría
         * seguido en verde mientras el foco hacía lo contrario de reforzar.
         *
         * Lo que se ata ahora es la propiedad: el borde de foco contrasta
         * MÁS que el de reposo contra el relleno del campo, en la rama que
         * toque. Es indiferente a qué token se use, y se rompe justo cuando
         * el refuerzo deja de reforzar.
         */
        const colorDe = (bloque: string): string => {
          const m = bloque.match(/border-color:\s*([^;]+);/);
          return (m?.[1] ?? "").trim();
        };
        // La regla base de styled-components no lleva pseudo-clase en su
        // SELECTOR, pero sí dos puntos en cada declaración: filtrar por
        // `includes(":")` descartaba justo la que se busca.
        const reposo = reglas.find((regla) =>
          /border:\s*1px\s+solid\s+oklch\(/.test(regla),
        );
        const colorReposo = (reposo?.match(
          /border:\s*1px\s+solid\s+(oklch\([^)]+\))/,
        ) ?? [])[1];
        const colorFoco = colorDe(bloqueFocus as string);

        expect(
          colorReposo,
          "no se leyó el color del borde en reposo",
        ).toBeTruthy();
        expect(colorFoco, "no se leyó el color del borde en foco").toBeTruthy();

        const relleno = theme.semantic.surface;
        const cReposo = contrastRatio(colorReposo as string, relleno);
        const cFoco = contrastRatio(colorFoco, relleno);

        // Reposo por encima del umbral de 1.4.11 para el contorno de un
        // control, y foco estrictamente por encima del reposo.
        expect(cReposo).toBeGreaterThanOrEqual(3);
        expect(cFoco).toBeGreaterThan(cReposo);

        // No sustituye el anillo global (regla dura: outline: none vetado).
        expect(reglas.some((regla) => /outline\s*:\s*none/.test(regla))).toBe(
          false,
        );
      },
    );
  });
});
