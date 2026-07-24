import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Field, Input } from "./Input";

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

  it("marca aria-invalid con error", () => {
    renderWithProviders(
      <Input
        aria-invalid
        error
      />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("deriva aria-invalid del prop error sin necesitar pasarlo explícitamente", () => {
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

  it("conecta el mensaje de error al control vía aria-describedby y marca aria-invalid", () => {
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
});
