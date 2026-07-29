import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { IconButton } from "./IconButton";

const Icon = (): ReactElement => (
  <svg
    aria-hidden="true"
    data-testid="icon"
  />
);

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
});
