import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FeaturesCelestialGuide } from "./FeaturesCelestialGuide";

describe("FeaturesCelestialGuide", () => {
  it("renderiza una unica imagen decorativa dentro de un contenedor aria-hidden", () => {
    const { container } = render(<FeaturesCelestialGuide />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");

    const imgs = container.querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    const img = imgs[0];
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img).toHaveAttribute(
      "src",
      "/features/celestial-guide/celestial-guide.webp",
    );
    expect(img.getAttribute("srcset")).toBe(
      "/features/celestial-guide/celestial-guide-1024.webp 1024w, /features/celestial-guide/celestial-guide.webp 2560w",
    );
  });

  it("la imagen no tiene nombre accesible (decorativa, alt vacio)", () => {
    const { container } = render(<FeaturesCelestialGuide />);
    expect(container.querySelector("img")).not.toHaveAccessibleName();
  });
});
