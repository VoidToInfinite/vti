import { describe, it, expect } from "vitest";
import { renderWithProviders } from "@/test/test-utils";
import { EyeCornerMark } from "./EyeCornerMark";

describe("EyeCornerMark", () => {
  it("es decoracion pura", () => {
    const { container } = renderWithProviders(<EyeCornerMark visible />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("refleja su visibilidad en un atributo testeable", () => {
    const { container, rerender } = renderWithProviders(
      <EyeCornerMark visible={false} />,
    );
    expect(container.firstElementChild).toHaveAttribute(
      "data-visible",
      "false",
    );
    rerender(<EyeCornerMark visible />);
    expect(container.firstElementChild).toHaveAttribute("data-visible", "true");
  });
});
