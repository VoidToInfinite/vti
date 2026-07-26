import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("usa el viewBox de la marca (500x550)", () => {
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 500 550");
  });

  it("sin title: es decorativo, aria-hidden y sin role", () => {
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("con title: expone role=img y nombre accesible", () => {
    renderWithProviders(<Logo title="VoidToInfinite" />);
    const img = screen.getByRole("img", { name: "VoidToInfinite" });
    expect(img).toBeInTheDocument();
    expect(img).not.toHaveAttribute("aria-hidden");
  });

  it("la prop size se refleja en el atributo width del svg", () => {
    const { container } = renderWithProviders(<Logo size="1.5rem" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "1.5rem");
  });

  it("por defecto size es 1em", () => {
    const { container } = renderWithProviders(<Logo />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "1em");
  });
});
