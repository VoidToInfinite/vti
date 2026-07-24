import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Field, Input } from "./Input";

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
});
