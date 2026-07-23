import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "@/test/test-utils";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renderiza el heading 404 traducido", () => {
    renderWithProviders(<NotFound />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByText(/no encontrada/i)).toBeInTheDocument();
  });
});
