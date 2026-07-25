import { createRef } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Button } from "./Button";

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
});
