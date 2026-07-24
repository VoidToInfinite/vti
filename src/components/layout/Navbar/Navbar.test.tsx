import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  it("expone el landmark de navegación", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("arranca sin estado scrolled", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-scrolled",
      "false",
    );
  });
});
