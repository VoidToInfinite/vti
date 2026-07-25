import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Card } from "./Card";

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
});
